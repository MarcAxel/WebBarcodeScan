"use strict";

const { log } = require("console");
const { Hash } = require("crypto");
var express = require("express");
var app = express();
var server = require("http").createServer(app);
var io = require("socket.io")(server);
var sqlite3 = require("sqlite3").verbose();
var fs = require("fs");
var request = require("request");
//let prompt = require('password-prompt')

var port = process.env.PORT || 3000;
var db = new sqlite3.Database("./data/scanData.sqlite");
var proc = 0;

server.listen(port, function () {
  console.log("Server listening at port %d", port);
});

app.use(express.static(__dirname + "/src"));

io.on("connection", function (socket) {
  socket.on("sig_barcode", function (data) {
    console.log("Barcode is " + data);

    var red = data.toString();
    var company, size_prod;
    var company_code = red.substring(0, 7);
    var size_code = red.substring(7, 10);

    if (company_code == "6971106") {
      company = "PT. Latiao Snack";
    } else {
      company = "Other";
    }

    if (size_code == "100") {
      size_prod = "Small";
    } else if (size_code == "101") {
      size_prod = "Big";
    } else {
      size_prod = "Other";
    }

    db.serialize(function () {
      console.log("inserting message to database");
      var insertMessageStr =
        "INSERT INTO barcodes (barcode_msg, log_date, company, size_type) VALUES ('" +
        data.toString() +
        "'," +
        Date.now() +
        ",'" +
        company +
        "','" +
        size_prod +
        "');";
      console.log(insertMessageStr);
      db.run(insertMessageStr);
    });
    socket.emit("process_done");
  });

  socket.on("print", function () {
    db.get("select count(*) from barcodes", function (err, row) {
      if (err) {
        console.error("error looking up data printing", err);
        return;
      }

      if (row["count(*)"] !== 0) {
        console.log("Printing in process...");

        var count_item = 0;
        var count_small = 0;
        var count_big = 0;
        var count_other = 0;

        var checkItemExists = "select count(*) from barcodes";
        var checkSmallExists =
          "select count(*) from barcodes where size_type is 'Small'";
        var checkBigExists =
          "select count(*) from barcodes where size_type is 'Big'";
        var checkOtherExists =
          "select count(*) from barcodes where size_type is 'Other'";

        read_test(checkSmallExists).then((res) => {
          count_small = res.data;
          console.log("count_small: " + count_small);
          proc++;
        });

        read_test(checkBigExists).then((res) => {
          count_big = res.data;
          console.log("count_big: " + count_big);
          proc++;
        });

        read_test(checkOtherExists).then((res) => {
          count_other = res.data;
          console.log("count_other: " + count_other);
          proc++;
        });

        read_test(checkItemExists).then((res) => {
          count_item = res.data;
          console.log("count_item: " + count_item);
          proc++;
        });

        setTimeout(() => {
          conf_data(count_item, count_small, count_big, count_other)
            .then(socket.emit("print_done"))
            .then((proc = 0));
        }, 100);
      } else {
        console.log("No data to print. Please scan first!");
      }
    });
  });
});

console.log("proc: " + proc);

db.serialize(function () {
  console.log("creating databases if they don't exist");
  db.run(
    "create table if not exists barcodes (barcode_id integer primary key, barcode_msg text, log_date integer, company text, size_type text)"
  );
});

function correction(val, ret) {
  if (val < 10) {
    ret = "0" + val.toString();
  } else {
    ret = val.toString();
  }
}

function read_test(comm) {
  return new Promise((res, rej) =>
    setTimeout(() => {
      db.get(comm, function (err, row) {
        if (row["count(*)"] !== 0) {
          //console.log("masuk" + comm);
          return res({ data: row["count(*)"] });
        } else {
          clearTimeout();
          return res({ data: row["count(*)"] });
        }
      });
    })
  );
}

function conf_data(count_item, count_small, count_big, count_other) {
  return new Promise((res) =>
    setTimeout(() => {
      const d = new Date();
      var day, month;
      var itm, sml, bg, otr;

      if (d.getDate() < 10) {
        day = "0" + d.getDate();
      } else {
        day = d.getDate();
      }

      if (d.getMonth() + 1 < 10) {
        month = "0" + (d.getMonth() + 1);
      } else {
        month = d.getMonth() + 1;
      }

      if (count_item < 10) {
        itm = "0" + count_item;
      } else {
        itm = count_item;
      }

      if (count_small < 10) {
        sml = "0" + count_small;
      } else {
        sml = count_small;
      }

      if (count_big < 10) {
        bg = "0" + count_big;
      } else {
        bg = count_big;
      }

      if (count_other < 10) {
        otr = "0" + count_other;
      } else {
        otr = count_other;
      }

      var zpl =
        "^XA^FX Counting Item^CF0,100^FO150,100,2^TBN,120,100^FD" +
        count_item.toString() +
        "^FS^CF0,30^FO270,150^FDItem^FS^FX Barcode Field^BY2,1,100^FO55,230,2^BC^FD" +
        itm.toString() +
        sml.toString() +
        bg.toString() +
        otr.toString() +
        day +
        month +
        "^FS^FX Item List^CF0,20^FO80,400^FDSmall^FS^FO205,400^FDBig^FS^FO310,400^FDOther^FS^CF4,30^FO87,430,2^TBN,50,25^FD" +
        count_small.toString() +
        "^FS^FO203,430,2^TBN,50,25^FD" +
        count_big.toString() +
        "^FS^FO315,430,2^TBN,50,25^FD" +
        count_other.toString() +
        "^FS^FX Detail Project^CF0,20^FO130,530,2^TBN,220,20^FDLabel Print Project (" +
        day +
        month +
        ")^FS^CF0,18^FO180,560^FDMarc's Corp^FS^XZ";

      var options = {
        encoding: null,
        formData: { file: zpl },
        // omit this line to get PNG images back
        headers: { Accept: "application/pdf" },
        // adjust print density (8dpmm), label width (4 inches), label height (6 inches), and label index (0) as necessary
        url: "http://api.labelary.com/v1/printers/8dpmm/labels/4x6/0/",
      };

      request.post(options, function (err, resp, body) {
        if (err) {
          return console.log(err);
        }
        var filename =
          "./print/label_" +
          d.getFullYear() +
          month +
          day +
          "_" +
          Date.now() +
          ".pdf";
        fs.writeFile(filename, body, function (err) {
          if (err) {
            console.log(err);
          }
        });
        console.log("PDF Created!!");
      });

      fs.copyFile(
        "./data/scanData.sqlite",
        "./data/archive/scanData_" + Date.now() + ".sqlite",
        (err) => {
          if (err) throw err;
          console.log("File DB was archived to destination");
        }
      );

      db.run("DELETE FROM barcodes");
      console.log("Data DB has been cleared");
      count_item = 0;
      count_small = 0;
      count_big = 0;
      count_other = 0;
    }, 2000)
  );
}
