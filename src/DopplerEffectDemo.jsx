import React from 'react';
import { OscillatorPlayer, OscillatorRecorder, Filelayer, LiveAudioAnalyser } from './AudioPlayer';

export class DopplerEffectDemo extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isPlaying: false,
      freq: 440,
      duration: 3,
      selectedFile: null,
      downloadUrl: null
    }
    this.canvasRef = React.createRef();
    this.downloadRef = React.createRef();
    this.captureCanvasRef = React.createRef();
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
    const canvasCtx = this.canvasRef.current.getContext("2d");
    this.drawWave(player, canvasCtx);
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
    const canvasCtx = this.canvasRef.current.getContext("2d");
    this.drawWave(player, canvasCtx);
  }

  captureLiveAudio = () => {
    const player = new LiveAudioAnalyser();
    player.buildGraph();
    const canvasCtx = this.captureCanvasRef.current.getContext("2d");
    this.drawWave(player, canvasCtx);    
  }

  drawWave = (player, canvasCtx) => {
    const analyser = player.getAnalyser();
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.draw(canvasCtx, analyser, dataArray)();
  }

  draw = (canvasCtx, analyser, dataArray) => () => {
    requestAnimationFrame(this.draw(canvasCtx, analyser, dataArray));
    const bufferLength = analyser.frequencyBinCount;
    const width = this.canvasRef.current.width;
    const height = this.canvasRef.current.height;

    analyser.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = "rgb(200, 200, 200)";
    canvasCtx.fillRect(0, 0, width, height);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = "rgb(0, 0, 0)";

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

  render() {
    const { freq, duration, isPlaying, selectedFile, downloadUrl } = this.state;
    return (
      <div id='container'>
        <h1>dopplerEffect Demo</h1>
        <input type = 'text' id = 'waveFreqInput' disabled={isPlaying} value ={freq} onChange={this.handleFreqChange}/>
        <input type = 'text' id = 'waveDurationInput' disabled={isPlaying}  value ={duration} onChange={this.handleDurationChange}/>
        <button id = 'playSinWaveButton' disabled={isPlaying}  onClick={this.handlePlay(false)}>Play Sin Wave</button>
        <button id = 'recordSinWaveButton' disabled={isPlaying}  onClick={this.handlePlay(true)}>Record Sin Wave</button>
        { downloadUrl && !isPlaying && <a id = 'download' ref= {this.downloadRef} href={downloadUrl} download={`${this.state.freq}-${this.state.duration}-sinwave.wav`}>Download Recorded Sin Wave</a> }
        <input type='file' accept='audio/*' id='fileInput' onChange={this.handleFileChange}/>
        <button id = 'recordSinWaveButton' disabled={isPlaying || !selectedFile}  onClick={this.handleFilePlay}>Play Selected Audio</button>
        <canvas width="640" height="100" ref={this.canvasRef}></canvas> 
        <button id = 'caputureLiveAudioButton' disabled={isPlaying}  onClick={this.captureLiveAudio}>Caputre Live Audio</button>
        <canvas width="640" height="100" ref={this.captureCanvasRef}></canvas> 
      </div>
    )
  }
}

export default DopplerEffectDemo;