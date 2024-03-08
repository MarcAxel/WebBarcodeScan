var fs = require("fs");
var request = require("request");
var sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database("./data/archive/scanData_1705773752875.sqlite");

var checkItemExists = "select count('barcode_id') from barcodes";
var checkSmallExists =
  "select count(*) from barcodes where size_type is 'Small'";
var checkBigExists = "select count(*) from barcodes where size_type is 'Big'";
var checkOtherExists =
  "select count(*) from barcodes where size_type is 'Other'";
var count_item;
var count_small;
var count_big;
var count_other;

async function printing() {
  count_item = await new Promise((res) =>
    setTimeout(() => {
      db.get(checkItemExists, function (err, row) {
        if (err) {
          console.error("error looking up item exists", err);
          return;
        }

        if (row["count('barcode_id')"] !== 0) {
          return res(row["count('barcode_id')"]);
        }
      });
    })
  );

  count_small = await new Promise((res) =>
    setTimeout(() => {
      db.get(checkSmallExists, function (err, row) {
        if (err) {
          console.error("error looking up item exists", err);
          return;
        }

        if (row["count(*)"] !== 0) {
          return res(row["count(*)"]);
        }
      });
    })
  );

  count_big = await new Promise((res) =>
    setTimeout(() => {
      db.get(checkBigExists, function (err, row) {
        if (err) {
          console.error("error looking up item exists", err);
          return;
        }

        if (row["count(*)"] !== 0) {
          return res(row["count(*)"]);
        }
      });
    })
  );

  count_other = await new Promise((res) =>
    setTimeout(() => {
      db.get(checkOtherExists, function (err, row) {
        if (err) {
          console.error("error looking up item exists", err);
          return;
        }

        if (row["count(*)"] !== 0) {
          return res(row["count(*)"]);
        }
      });
    })
  );

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
}

printing();
