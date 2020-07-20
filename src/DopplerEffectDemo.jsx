import React from 'react';
import { OscillatorPlayer, OscillatorRecorder, Filelayer, LiveAudioAnalyser } from './AudioPlayer';

export class DopplerEffectDemo extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isPlaying: false,
      isCapturing: false,
      freq: 18000,
      duration: 3,
      selectedFile: null,
      downloadUrl: null
    }
    this.downloadRef = React.createRef();
    this.oscillatorPlayerCanvasRef = React.createRef();
    this.filePlayerCanvasRef = React.createRef();
    this.liveAudioCanvasRef = React.createRef();
  }

  handleFreqChange = (e) => {
    const freq = e.target.value;
    this.setState({
      freq
    });
  }

  handleDurationChange = (e) => {
    const duration = e.target.value;
    this.setState({
      duration
    });
  }

  handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    this.setState({
      selectedFile
    });
  }

  getFFTSzie = (freq) => {
    const seconds = 8.0 / freq; // times to fill 4 circle
    const windowSize = 44100 * seconds;
    let fftSize = 32;
    while(fftSize < windowSize) {
      fftSize *= 2;
    }
    console.log({fftSize})
    return fftSize;
  }

  handlePlay = (isRecord) => () => {
    const {freq, duration} = this.state;
    const options = {freq, duration};
    const player = isRecord ? new OscillatorRecorder(options) : new OscillatorPlayer(options);
    player.onended = () => {
      this.setState({
        isPlaying: false
      })
    }
    if(isRecord) {
      player.onstop = (url) => {
        this.setState({
          downloadUrl: url
        });
      }
    }
    this.setState({
      isPlaying: true
    })
    player.buildGraph().then(() => player.play());
    this.draw(player, this.oscillatorPlayerCanvasRef);
  }

  handleFilePlay = () => {
    const { selectedFile } = this.state;
    if(!selectedFile) {
      return;
    }

    const player = new Filelayer({file:selectedFile});
    player.onended = () => {
      this.setState({
        isPlaying: false
      })
    }    
    this.setState({
      isPlaying: true
    })    
    player.buildGraph().then(() => player.play());
    this.draw(player, this.filePlayerCanvasRef);
  }

  captureLiveAudio = () => {
    const player = new LiveAudioAnalyser();
    player.buildGraph();
    this.draw(player, this.liveAudioCanvasRef, {getFreq: true, drawBar: true});
    this.setState({
      isCapturing: true
    })
  }

  draw = (player, canvasRef, options = {}) => {
    const { getFreq = false, drawBar = false } = options;

    const analyser = player.getAnalyser();
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const getData = () => {
      if(getFreq) {
        analyser.getByteFrequencyData(dataArray);
      }
      else {
        analyser.getByteTimeDomainData(dataArray);
      }
      return dataArray;
    }

    if(drawBar) {
      requestAnimationFrame(this.drawFreqBar(canvasRef, getData));
    }
    else {
      requestAnimationFrame(this.drawSinWave(canvasRef, getData));
    }
  }

  drawSinWave = (canvasRef, getData, options) => () => {
    requestAnimationFrame(this.drawSinWave(canvasRef, getData));

    const canvasCtx = canvasRef.current.getContext("2d");
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    const dataArray = getData();
    const bufferLength = dataArray.length;

    canvasCtx.fillStyle = "rgb(200, 200, 200)";
    canvasCtx.fillRect(0, 0, width, height);

    canvasCtx.lineWidth = 1;
    canvasCtx.strokeStyle = "rgb(0, 0, 200)";

    canvasCtx.beginPath();

    const sliceWidth = width * 1.0 / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const y = dataArray[i] * height / 256.0;

      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    canvasCtx.lineTo(width, height / 2);
    canvasCtx.stroke();
  }

  drawFreqBar = (canvasRef, getData) => () => {
    requestAnimationFrame(this.drawFreqBar(canvasRef, getData));

    const canvasCtx = canvasRef.current.getContext("2d");
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    const dataArray = getData();
    const bufferLength = dataArray.length;

    canvasCtx.fillStyle = "rgb(200, 200, 200)";
    canvasCtx.fillRect(0, 0, width, height);

    const barGap = 1;
    const barWidth = (width / bufferLength) - barGap;
    let x = 0;

    for(let i = 0; i < bufferLength; i++) {
      const barHeight = dataArray[i];
      canvasCtx.fillStyle = `rgb(50,50,${barHeight + 100})`;
      canvasCtx.fillRect(x,height-barHeight/2,barWidth,barHeight/2);
  
      x += barWidth + barGap;
    }
  }

  render() {
    const { freq, duration, isPlaying, isCapturing, selectedFile, downloadUrl } = this.state;

    return (
      <div id='container'>
        <h1>Doppler Effect Demo</h1>
        <p>
          <li>Enable live audio capture.</li>
          <li>Play a 18k Hz sound wave.</li>
          <li>Move your hand to microphone and away to see doppler effect.</li>
        </p>

        <div className='playerContainer'>
          <h2>Capture live audio</h2>
          <button id = 'caputureLiveAudioButton' disabled={isCapturing} onClick={this.captureLiveAudio}>Start Capture Live Audio</button>
          <p>Frequence data bar diagram from microphone</p>
          <canvas className='soundWave' ref={this.liveAudioCanvasRef}></canvas>           
        </div>

        <div className='playerContainer'>
          <h2>Generate a sound wave with specified frequence</h2>
          <div id='labelAndInput'>
            <label>Wave Frequence: </label>
            <input type = 'text' id = 'waveFreqInput' disabled={isPlaying} value ={freq} onChange={this.handleFreqChange}/>
          </div>

          <div id='labelAndInput'>
            <label>Wave Duration(seconds): </label>
            <input type = 'text' disabled={isPlaying}  value ={duration} onChange={this.handleDurationChange}/>
          </div>
          <div id='buttonGroup'>
            <button disabled={isPlaying}  onClick={this.handlePlay(false)}>Play Sound Wave</button>
            <button disabled={isPlaying}  onClick={this.handlePlay(true)}>Record Sound Wave</button>
          </div>
          { downloadUrl && !isPlaying && <a id = 'download' ref= {this.downloadRef} href={downloadUrl} download={`${this.state.freq}-${this.state.duration}-sinwave.wav`}>Download Recorded Sound Wave</a> }
          <p>Sound Wave Visualization</p>
          <canvas className='soundWave'ref={this.oscillatorPlayerCanvasRef}></canvas> 
        </div>

        <div className='playerContainer'>
          <h2>Play a local audio file (verify recorded sound wave)</h2>
          <input type='file' accept='audio/*' id='fileInput' onChange={this.handleFileChange}/>
          <button id = 'filePlayButton' disabled={isPlaying || !selectedFile}  onClick={this.handleFilePlay}>Play Selected Audio</button>
          <p>Sound Wave Visualization</p>
          <canvas className='soundWave' ref={this.filePlayerCanvasRef}></canvas> 
        </div>
      </div>
    )
  }
}

export default DopplerEffectDemo;