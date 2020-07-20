let AudioContext = window.AudioContext // Default
    || window.webkitAudioContext // Safari and old versions of Chrome
    || false;

if (!AudioContext) {
    // Web Audio API is not supported
    alert("Sorry, but the Web Audio API is not supported by your browser. Please, consider upgrading to the latest version or downloading Google Chrome or Mozilla Firefox");
}

export class AudioPlayer {
  constructor(options = {}) {
    const { fftSize } = options;
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = fftSize || 256;
    this.gain = this.audioContext.createGain();
    this.src = null;
    this.onended = null;

    this.isPlaying = false;
  }

  getAnalyser() {
    return this.analyser;
  }
}

export class OscillatorPlayer extends AudioPlayer {
  constructor(options) {
    super(options);
    const {freq, duration} = options;
    this.freq = freq;
    this.duration = duration;
  }

  buildGraph() {
    this.src = this.audioContext.createOscillator();
    this.src.frequency.value = this.freq;
    this.src.connect(this.audioContext.destination);
    this.src.connect(this.analyser);

    if(this.onended) {
      this.src.onended = this.onended;
    }

    return Promise.resolve();
  }

  play() {
    this.src.start();
    this.src.stop(this.duration);
  }
}

export class OscillatorRecorder extends AudioPlayer {
  constructor(options) {
    super(options);
    const {freq, duration} = options;
    this.freq = freq;
    this.duration = duration;
    this.recorder = null;
  }

  buildGraph() {
    this.src = this.audioContext.createOscillator();
    this.src.frequency.value = this.freq;
    const dest = this.audioContext.createMediaStreamDestination()
    this.src.connect(dest);
    this.src.connect(this.analyser);

    const recordedChunks = [];
    this.recorder = new MediaRecorder(dest.stream);

    this.src.onended = () => {
      if(this.onended) {
        this.onended();
      }

      this.recorder.stop();
    }

    this.recorder.ondataavailable = (e) => {
      recordedChunks.push(e.data);
    }

    this.recorder.onstop = (e) => {
      const blob = new Blob(recordedChunks);
      const url = URL.createObjectURL(blob);
      if(this.onstop) {
        this.onstop(url);
      }
    }

    return Promise.resolve();
  }

  play() {
    this.src.start();
    this.src.stop(this.duration);
    this.recorder.start();
  }
}

export class Filelayer extends AudioPlayer {
  constructor(options) {
    super(options);
    this.file = options.file;
  }

  buildGraph() {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsArrayBuffer(this.file);
      fileReader.onload = () => {
        this.src = this.audioContext.createBufferSource();
        this.audioContext.decodeAudioData(fileReader.result, (buffer) => {
          this.src.buffer = buffer;
          this.src.onended = () => {
            if(this.onended) {
              this.onended();
            }
          }
          this.src.connect(this.analyser).connect(this.audioContext.destination);
          resolve();
        });
      } // fileReaded.onload
    });
  }

  play() {
    this.src.start();
  }
}

export class LiveAudioAnalyser extends AudioPlayer {
  buildGraph() {
    return new Promise((resolve, reject) => {
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then((stream) => {
        this.src = this.audioContext.createMediaStreamSource(stream);
        this.src.connect(this.analyser);
        resolve();
      });
    });
  }

  play() {
  }
}