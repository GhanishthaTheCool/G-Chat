import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send } from 'lucide-react';
import { Attachment } from '../types';

interface VoiceRecorderProps {
  onRecorded: (attachment: Attachment) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onRecorded, onCancel }) => {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopTimer();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setRecording(true);

      timerRef.current = window.setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
      alert('Microphone permission was denied or is not supported.');
      onCancel();
    }
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleFinish = async () => {
    stopTimer();
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    recorder.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const attachment: Attachment = {
          id: `voice-${Date.now()}`,
          name: `voice-note-${new Date().toISOString().substring(11, 19)}.webm`,
          size: audioBlob.size,
          mimeType: 'audio/webm',
          encryptedDataUrl: base64data,
          type: 'voice',
          duration: seconds,
        };
        onRecorded(attachment);
      };
      reader.readAsDataURL(audioBlob);
    };

    recorder.stop();
  };

  const handleDiscard = () => {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    onCancel();
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex items-center gap-3 w-full bg-slate-900/90 border border-emerald-500/40 rounded-2xl px-4 py-2.5 shadow-lg">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
        <span className="text-xs font-mono text-white font-bold">{formatTime(seconds)}</span>
      </div>

      {/* Animated audio wave bars */}
      <div className="flex-1 flex items-center justify-center gap-1 h-6 px-2 overflow-hidden">
        {[40, 70, 90, 30, 80, 100, 50, 85, 30, 60, 95, 45, 75, 100, 40].map((h, i) => (
          <div
            key={i}
            className="w-1 bg-emerald-400 rounded-full transition-all duration-150 animate-pulse"
            style={{
              height: `${recording ? (h * (0.4 + Math.random() * 0.6)) : 20}%`,
              animationDelay: `${i * 70}ms`,
            }}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleDiscard}
          className="p-2 rounded-xl bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-300 transition-colors cursor-pointer"
          title="Discard voice note"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleFinish}
          className="py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-transform hover:scale-105 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5 fill-slate-950" />
          <span>Send Audio</span>
        </button>
      </div>
    </div>
  );
};
