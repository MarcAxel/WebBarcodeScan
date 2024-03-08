$(function () {
  let selectedDeviceId = null;
  const codeReader = new ZXing.BrowserMultiFormatReader();
  const sourceSelect = $("#pilihKamera");
  var socket = io();

  $(document).on("change", "#pilihKamera", function () {
    selectedDeviceId = $(this).val();
    if (codeReader) {
      codeReader.reset();
      initScanner();
    }
  });

  function initScanner() {
    codeReader
      .listVideoInputDevices()
      .then((videoInputDevices) => {
        videoInputDevices.forEach((device) => {
          console.log(`${device.label}, ${device.deviceId}`);
        });

        if (videoInputDevices.length > 0) {
          if (selectedDeviceId == null) {
            videoInputDevices.forEach((element) => {
              if (
                element.deviceId ==
                "3a6a3ebf554619d5ce25508e786bce5ec1be414a930bdf2be41e6cb90edd96ff"
              ) {
                selectedDeviceId =
                  "3a6a3ebf554619d5ce25508e786bce5ec1be414a930bdf2be41e6cb90edd96ff";
              } else {
                selectedDeviceId = videoInputDevices[0].deviceId;
              }
            });
          }

          if (videoInputDevices.length >= 1) {
            sourceSelect.html("");
            videoInputDevices.forEach((element) => {
              const sourceOption = document.createElement("option");
              sourceOption.text = element.label;
              sourceOption.value = element.deviceId;
              if (element.deviceId == selectedDeviceId) {
                sourceOption.selected = "selected";
              }
              sourceSelect.append(sourceOption);
            });
          }

          codeReader
            .decodeOnceFromVideoDevice(selectedDeviceId, "previewKamera")
            .then((result) => {
              //hasil scan
              console.log(result.text);
              $("#hasilscan").val(result.text);

              if (codeReader) {
                codeReader.reset();
                socket.emit("sig_barcode", result.text);
              }
            })
            .catch((err) => console.error(err));
        } else {
          alert("Camera not found!");
        }
      })
      .catch((err) => console.error(err));
  }

  if (navigator.mediaDevices) {
    initScanner();
  } else {
    alert("Cannot access camera.");
  }

  socket.on("process_done", function () {
    initScanner();
  });

  socket.on("print_done", function () {
    $("#hasilscan").val("");
    initScanner();
  });

  $("#chkbutton").on("click", function () {
    //console.log("Button Check Masuk");
    socket.emit("print");
  });
});
