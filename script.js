const video = document.querySelector('.player');
const countdown = document.querySelector('.countdown');
const flash = document.querySelector('.flash');
const strip = document.querySelector('.strip');
const canvasStrip = document.querySelector('.strip-canvas');
const startButton = document.querySelector('.start-session');
const downloadButton = document.querySelector('.download-strip');
const ctxStrip = canvasStrip.getContext('2d');
const filterSwitch = document.getElementById('filter-switch');

const captionInput = document.getElementById("caption-input");

captionInput.addEventListener('input', (e) => {
  if (window.latestCaption) {
    window.latestCaption.textContent = e.target.value || "Your Caption Here";
  }
});


let photoData = [];

// Access the webcam
function getVideo() {
  navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    .then(localMediaStream => {
      video.srcObject = localMediaStream;
      video.play();
    })
    .catch(err => {
      console.error('Webcam error:', err);
    });
}

// Countdown effect
function showCountdown(num) {
  return new Promise(resolve => {
    countdown.textContent = num;
    countdown.style.opacity = 1;
    setTimeout(() => {
      countdown.style.opacity = 0;
      resolve();
    }, 800);
  });
}

// Flash animation
function triggerFlash() {
  flash.style.opacity = 1;
  setTimeout(() => {
    flash.style.opacity = 0;
  }, 150);
}


// Take photo from video
function takePhoto() {
  const canvas = document.createElement('canvas');
  const width = video.videoWidth;
  const height = video.videoHeight;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.translate(width, 0); // mirror image
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, width, height);
  // return canvas.toDataURL('image/jpeg');

  if (filterSwitch.checked) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i] = data[i + 1] = data[i + 2] = avg; // R, G, B
    }
    ctx.putImageData(imageData, 0, 0);
  }
  return canvas.toDataURL('image/jpeg')
}

// Start a 3-photo session
async function startPhotoSession() {
    photoData = [];

    // Countdown and capture photos
    for (let i = 0; i < 3; i++) {
      for (let j = 3; j > 0; j--) {
        await showCountdown(j);
      }

      triggerFlash();
      const dataURL = takePhoto();
      photoData.push(dataURL);

      await new Promise(res => setTimeout(res, 1000));
    }

    // Create a new strip element
    const stripContainer = document.createElement('div');
    stripContainer.classList.add('printed-strip');

    // NEW: get number of strips already printed
    const wrapper = document.getElementById('printed-strip-wrapper');
    const numStrips = wrapper.querySelectorAll('.printed-strip').length;

    // NEW: stacking position and tilt
    const rotation = (Math.random() * 4 - 2).toFixed(2);
    stripContainer.style.setProperty('--angle', `${rotation}deg`);
    stripContainer.style.zIndex = 10 + document.querySelectorAll('.printed-strip').length;

    // const offsetX = (Math.random() * 10 - 5).toFixed(0); // -5 to +5 px
    const offsetY = (Math.random() * 10).toFixed(0);     // 0 to +10 px
    // stripContainer.style.left = `${offsetX}px`;
    stripContainer.style.top = `${offsetY}px`;

    stripContainer.style.left = '50%'; // center
    stripContainer.style.transform = 'translateX(-50%) rotate(' + rotation + 'deg)';



    // Photos
    const stripPhotos = document.createElement('div');
    stripPhotos.classList.add('strip-photos');
    photoData.forEach(src => {
      const img = document.createElement('img');
      img.src = src;
      stripPhotos.appendChild(img);
    });

    // Caption (editable)
    const captionText = document.getElementById("caption-input").value.trim();
    let caption = null;

    if (captionText !== "") {
      caption = document.createElement('p');
      caption.classList.add('caption');
      caption.contentEditable = true;
      caption.textContent = captionText;
    }

    // Download Button (per strip)
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '📥 Download';
    downloadBtn.className = 'download-button';

    downloadBtn.addEventListener('click', () => {
      downloadBtn.style.display = 'none';

      html2canvas(stripContainer, {
        backgroundColor: null,
        scale: 2
      }).then(canvas => {
        const link = document.createElement('a');
        // link.download = 'photo_strip_with_caption.png';

        // Get caption and sanitize it for use as filename
        // const rawCaption = caption.textContent.trim();
        const rawCaption = caption ? caption.textContent.trim() : '';
        const safeCaption = rawCaption.replace(/[^a-z0-9_\-]/gi, '_') || 'photo_strip';
        link.download = `${safeCaption}.png`;

        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    });

    // Combine
    stripContainer.appendChild(stripPhotos);
    if (caption) {
      stripContainer.appendChild(caption);
      window.latestCaption = caption;  // <-- ✅ Add this line
    }
    stripContainer.appendChild(downloadBtn);

    // Add click behavior for bring-to-front
    // stripContainer.addEventListener('click', () => {
    //   stripContainer.style.zIndex = 3;
    //   document.getElementById("message-card").style.zIndex = 2;
    //   addAnimation(stripContainer, 'bounce');
    // });

    stripContainer.addEventListener('click', () => {
      if (topElement !== "strip") bringToFront("strip");
    });

    // Add to wrapper
    // const wrapper = document.getElementById('printed-strip-wrapper');
    // wrapper.appendChild(stripContainer);
    const trayContainer = document.querySelector('.tray-container');
    trayContainer.appendChild(stripContainer);  

    wrapper.classList.add('show');

    // Reveal card
    const messageCard = document.getElementById('message-card');
    const cardText = document.getElementById('message-input').value || "A message to remember!";
    document.getElementById('card-text').innerText = cardText;
    messageCard.classList.remove('hidden');
    messageCard.style.zIndex = 2;

    // Add click behavior for bring-to-front on card
    // messageCard.onclick = () => {
    //   messageCard.style.zIndex = 3;
    //   stripContainer.style.zIndex = 2;
    //   addAnimation(messageCard, 'tilt');
    // };
    
      messageCard.onclick = () => {
        if (topElement !== "card") bringToFront("card");
      };

    // Tray and download visibility
    document.getElementById('tray-slot').classList.remove('hidden');
    document.getElementById('download-controls').classList.remove('hidden');

    // Scroll to it
    stripContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Reset inputs
    document.getElementById("caption-input").value = "";
    document.getElementById("message-input").value = "";

    // Track latest strip
    window.latestStrip = stripContainer;

}


document.getElementById('caption-input').addEventListener('input', (e) => {
  if (window.latestCaption) {
    window.latestCaption.textContent = e.target.value || "Your Caption Here";
  }
});


// Update card message live after session
document.getElementById('message-input').addEventListener('input', (e) => {
  document.getElementById('card-text').innerText = e.target.value || "A message to remember!";
});


// Download a single strip image
function downloadStrip() {
  const printedStrip = document.getElementById('printed-strip');

  html2canvas(printedStrip, {
    backgroundColor: null,
    scale: 2 // higher quality
  }).then(canvas => {
    const link = document.createElement('a');
    link.download = 'photo_strip_with_caption.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
}

filterSwitch.addEventListener('change', () => {
  video.classList.remove('video-digital', 'video-bw');

  if (filterSwitch.checked) {
    video.classList.add('video-bw');
  } else {
    video.classList.add('video-digital');
  }
});

getVideo();
video.classList.add('video-digital');


startButton.addEventListener('click', startPhotoSession);
// downloadButton.addEventListener('click', downloadStrip);

// const stripEl = document.getElementById('printed-strip');
const cardEl = document.getElementById('message-card');

// helper to remove animation class after it plays
function addAnimation(el, className) {
  el.classList.add(className);
  setTimeout(() => el.classList.remove(className), 400);
}

// stripEl.addEventListener('click', () => {
//   // bring strip forward
//   stripEl.classList.add('bring-to-front');
//   cardEl.classList.remove('bring-to-front');
//   addAnimation(stripEl, 'bounce');
// });

cardEl.addEventListener('click', () => {
  // bring card forward
  cardEl.classList.add('bring-to-front');
  stripEl.classList.remove('bring-to-front');
  addAnimation(cardEl, 'tilt');
});

// Track which one is on top
let topElement = "strip";

// Toggle strip/card z-index
function bringToFront(target) {
  const strip = window.latestStrip;
  const card = document.getElementById('message-card');

  strip.classList.remove('bring-to-front');
  card.classList.remove('bring-to-front');

  if (target === "strip") {
    strip.classList.add('bring-to-front');
    strip.style.zIndex = 3;
    card.style.zIndex = 2;
    addAnimation(strip, 'bounce');
    topElement = "strip";
  } else {
    card.classList.add('bring-to-front');
    card.style.zIndex = 3;
    strip.style.zIndex = 2;
    addAnimation(card, 'tilt');
    topElement = "card";
  }
}

