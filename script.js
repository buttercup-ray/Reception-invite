const flap = document.getElementById("flap");
const scene = document.querySelector(".envelope-scene");
const invite = document.getElementById("invite");
const wrapper = document.getElementById("wrapper");

const music = document.getElementById("bgMusic");

const musicToggle = document.getElementById("musicToggle");
const musicIcon = document.getElementById("musicIcon");

let started = false;
let muted = false;
let currentVolume = 0;

let audioCtx = null;
let musicSource = null;
let gainNode = null;

const isMobileViewport = window.matchMedia("(max-width: 768px)").matches;
const targetVolume = isMobileViewport ? 0.01 : 0.05;

const setEffectiveVolume = (value) => {
  currentVolume = value;

  if (gainNode) {
    gainNode.gain.value = muted ? 0 : value;
    return;
  }

  music.volume = muted ? 0 : value;
};

const setupAudioGain = async () => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass || gainNode) return;

  audioCtx = new AudioContextClass();
  musicSource = audioCtx.createMediaElementSource(music);
  gainNode = audioCtx.createGain();

  gainNode.gain.value = 0;
  musicSource.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }
};

/* =========================
   ALWAYS START FROM FOLD 1
========================= */

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

const resetToTop = () => {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
};

window.addEventListener("load", () => {
  document.body.classList.add("envelope-locked");
  resetToTop();
  requestAnimationFrame(resetToTop);
});

window.addEventListener("pageshow", () => {
  document.body.classList.add("envelope-locked");
  resetToTop();
});

/* =========================
   ENVELOPE OPEN
========================= */

flap.addEventListener("click", async () => {
  resetToTop();

  /* START MUSIC */

  if (!started) {

    started = true;

    try {

      await setupAudioGain();
      setEffectiveVolume(0);

      await music.play();

      let volume = 0;
      const fade = setInterval(() => {

        volume += 0.02;

        if (volume >= targetVolume) {

          volume = targetVolume;

          clearInterval(fade);
        }

        setEffectiveVolume(volume);

      }, 120);

    } catch (err) {

      console.log("Music playback failed:", err);

    }
  }

  /* OPEN ENVELOPE */

  flap.classList.add("open");
  wrapper.classList.add("envelope-open");

  scene.classList.add("opening");

  /* REVEAL INVITE */

  setTimeout(() => {

    wrapper.classList.add("fade-out");
    document.body.classList.remove("envelope-locked");

    invite.classList.add("show");

    revealWeddingBackground();

  }, 1600);

});

/* =========================
   MUSIC TOGGLE
========================= */

musicToggle.addEventListener("click", () => {

  muted = !muted;

  music.muted = false;
  setEffectiveVolume(currentVolume);

  musicIcon.src = muted
    ? "music-off.svg"
    : "music-on.svg";

});

/* =========================
   RSVP -> GOOGLE SHEETS
========================= */

const rsvpForm = document.getElementById("rsvpForm");
const rsvpStatus = document.getElementById("rsvpStatus");
const rsvpSubmitButton = document.getElementById("rsvpSubmitButton");
const rsvpAttendeesInput = document.getElementById("rsvpAttendees");

if (rsvpForm && rsvpStatus && rsvpSubmitButton) {
  const setRsvpStatus = (message, isError = false) => {
    rsvpStatus.textContent = message;
    rsvpStatus.classList.toggle("is-error", isError);
  };

  const updateAttendeesState = () => {
    if (!rsvpAttendeesInput) return;

    const selectedAttendance = rsvpForm.querySelector("input[name='attendance']:checked");
    const isNo = selectedAttendance && selectedAttendance.value === "no";

    rsvpAttendeesInput.disabled = Boolean(isNo);
    rsvpAttendeesInput.required = !isNo;

    if (isNo) {
      rsvpAttendeesInput.value = "0";
    } else if (rsvpAttendeesInput.value === "0") {
      rsvpAttendeesInput.value = "";
    }
  };

  rsvpForm.querySelectorAll("input[name='attendance']").forEach((radio) => {
    radio.addEventListener("change", updateAttendeesState);
  });

  updateAttendeesState();

  rsvpForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const webhookUrl = (rsvpForm.dataset.sheetWebhookUrl || "").trim();

    if (!webhookUrl) {
      setRsvpStatus("Sheet webhook URL is missing.", true);
      return;
    }

    const formData = new FormData(rsvpForm);
    const attendance = (formData.get("attendance") || "").toString();
    const name = (formData.get("name") || "").toString().trim();
    const attendees = (formData.get("attendees") || "").toString().trim();

    if (!attendance || !name || !attendees) {
      setRsvpStatus("Please complete all RSVP fields.", true);
      return;
    }

    const attendeeCount = Number(attendees);
    if (!Number.isInteger(attendeeCount) || attendeeCount < 0) {
      setRsvpStatus("No. of Attendees must be a valid number.", true);
      return;
    }

    rsvpSubmitButton.disabled = true;
    rsvpSubmitButton.textContent = "Sending...";
    setRsvpStatus("Submitting your RSVP...");

    const payload = {
      timestamp: new Date().toISOString(),
      attendance,
      name,
      attendees: attendeeCount
    };

    try {
      await fetch(webhookUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });

      setRsvpStatus("Thank you! Your RSVP has been submitted.");
      rsvpForm.reset();
    } catch (error) {
      console.error("RSVP submit failed:", error);
      setRsvpStatus("Couldn't submit RSVP right now. Please try again.", true);
    } finally {
      rsvpSubmitButton.disabled = false;
      rsvpSubmitButton.textContent = "Send";
    }
  });
}

function revealWeddingBackground() {

  gsap.to(".bg1", {
    opacity: 1,
    duration: 1.8,
    ease: "power2.out"
  });

  gsap.to(".bg2", {
    opacity: 1,
    y: 0,
    duration: 1.6,
    delay: 0.4,
    ease: "power2.out"
  });

  gsap.to(".bg3", {
    opacity: 1,
    y: 0,
    duration: 1.5,
    delay: 0.7,
    ease: "power2.out"
  });

  gsap.to(".bg4", {
    opacity: 1,
    y: 0,
    duration: 1.4,
    delay: 1,
    ease: "power2.out"
  });

}
