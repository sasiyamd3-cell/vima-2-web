
const API_BASE = "https://sasiya-1-fef7afab0723.herokuapp.com";

$("qrBtn").addEventListener("click", async () => {
  if (activeRequest) return;

  activeRequest = true;
  $("qrBtn").disabled = true;

  $("qrImage").innerHTML =
    "<span>...</span><small>GENERATING QR</small>";

  setStatus("Generating QR code", "loading");

  try {
    const url = new URL("/qr", API_BASE);
    url.searchParams.set("token", "vimamods");

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error("QR request failed");
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("image/")) {
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      const img = document.createElement("img");
      img.src = imageUrl;

      $("qrImage").replaceChildren(img);
    } else {
      const data = await response.json();

      const qr = data.qr || data.qrCode || data.code;

      if (!qr) throw new Error("QR data not found");

      const img = document.createElement("img");

      if (qr.startsWith("data:image/")) {
        img.src = qr;
      } else if (/^https:\/\//i.test(qr)) {
        img.src = qr;
      } else {
        throw new Error("Unsupported QR response");
      }

      $("qrImage").replaceChildren(img);
    }

    setStatus("QR code generated");
    toast("MIYORA QR Ready");

  } catch (error) {
    $("qrImage").innerHTML =
      "<span>!</span><small>QR GENERATION FAILED</small>";

    setStatus(error.message, "error");
    toast(error.message);

  } finally {
    activeRequest = false;
    $("qrBtn").disabled = false;
  }
});
