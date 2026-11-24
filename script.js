
const API_BASE = "https://sasiya-1-fef7afab0723.herokuapp.com";

// Keep API credentials server-side in production.
const API_TOKEN = "vimamods";

const $ = id => document.getElementById(id);

let busy = false;
let toastTimer;

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove("show");
  }, 2800);
}

function setStatus(message, state = "") {
  $("statusText").textContent = message;
  $("statusDot").className = "status-indicator " + state;
}

function setBusy(value, button) {
  busy = value;
  $("pairBtn").disabled = value;
  $("qrBtn").disabled = value;

  if (button) {
    button.textContent = value ? "Please wait..." :
      button.id === "pairBtn" ? "Generate Pair Code" : "Generate QR Code";
  }
}

// TAB SWITCHING
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t =>
      t.classList.remove("active")
    );

    document.querySelectorAll(".panel").forEach(p =>
      p.classList.remove("active")
    );

    tab.classList.add("active");
    $(tab.dataset.tab).classList.add("active");

    setStatus("Waiting for connection");
  });
});

// PAIR CODE GENERATOR
async function generatePair() {
  if (busy) return;

  const number = $("phone").value.replace(/\D/g, "");

  if (number.length < 10 || number.length > 15) {
    toast("Please enter a valid phone number");
    $("phone").focus();
    return;
  }

  const btn = $("pairBtn");

  setBusy(true, btn);
  $("pairResult").classList.add("hidden");

  setStatus("Generating pairing code", "loading");

  try {
    const url = new URL("/pair", API_BASE);

    url.searchParams.set("number", number);
    url.searchParams.set("token", API_TOKEN);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Accept": "application/json, text/plain" }
    });

    if (!response.ok) {
      throw new Error("Pair request failed: " + response.status);
    }

    const contentType = response.headers.get("content-type") || "";
    let data;

    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = { code: await response.text() };
    }

    const code = typeof data === "string"
      ? data
      : data.code || data.pairingCode || data.pair_code;

    if (!code) {
      throw new Error("Pair code not found in response");
    }

    $("pairCode").textContent = String(code).trim();
    $("pairResult").classList.remove("hidden");

    setStatus("Pair code generated successfully", "success");
    toast("MIYORA Pair Code Ready");

  } catch (error) {
    console.error(error);
    setStatus("Pairing failed", "error");

    if (error instanceof TypeError) {
      toast("Network or CORS error. Check backend settings.");
    } else {
      toast(error.message);
    }
  } finally {
    setBusy(false, btn);
  }
}

// QR CODE GENERATOR
async function generateQR() {
  if (busy) return;

  const btn = $("qrBtn");

  setBusy(true, btn);

  $("qrImage").innerHTML =
    '<div class="qr-placeholder"><span>...</span><small>GENERATING QR</small></div>';

  setStatus("Generating QR code", "loading");

  try {
    const url = new URL("/qr", API_BASE);
    url.searchParams.set("token", API_TOKEN);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Accept": "application/json, image/*, text/plain" }
    });

    if (!response.ok) {
      throw new Error("QR request failed: " + response.status);
    }

    const type = response.headers.get("content-type") || "";
    let imageSrc = "";

    if (type.startsWith("image/")) {
      const blob = await response.blob();
      imageSrc = URL.createObjectURL(blob);
    } else {
      let data;

      if (type.includes("application/json")) {
        data = await response.json();
      } else {
        data = { qr: await response.text() };
      }

      const qr = typeof data === "string"
        ? data
        : data.qr || data.qrCode || data.qrcode || data.code;

      if (!qr) throw new Error("QR data not found");

      if (/^data:image\//i.test(qr) || /^https:\/\//i.test(qr)) {
        imageSrc = qr;
      } else {
        imageSrc = "data:image/png;base64," + qr;
      }
    }

    const img = document.createElement("img");

    img.alt = "MIYORA WhatsApp QR Code";
    img.src = imageSrc;

    img.onerror = () => {
      $("qrImage").innerHTML =
        '<div class="qr-placeholder"><span>!</span><small>INVALID QR IMAGE</small></div>';
      setStatus("Invalid QR image response", "error");
    };

    $("qrImage").replaceChildren(img);

    setStatus("QR code generated successfully", "success");
    toast("MIYORA QR Code Ready");

  } catch (error) {
    console.error(error);

    $("qrImage").innerHTML =
      '<div class="qr-placeholder"><span>!</span><small>QR GENERATION FAILED</small></div>';

    setStatus("QR generation failed", "error");

    if (error instanceof TypeError) {
      toast("Network or CORS error. Check backend settings.");
    } else {
      toast(error.message);
    }
  } finally {
    setBusy(false, btn);
  }
}

// BUTTON EVENTS
$("pairBtn").addEventListener("click", generatePair);
$("qrBtn").addEventListener("click", generateQR);

// ENTER KEY
$("phone").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    generatePair();
  }
});

// COPY PAIR CODE
$("copyBtn").addEventListener("click", async () => {
  const code = $("pairCode").textContent;

  try {
    await navigator.clipboard.writeText(code);
    toast("Pair code copied!");
  } catch {
    toast("Clipboard unavailable");
  }
});
