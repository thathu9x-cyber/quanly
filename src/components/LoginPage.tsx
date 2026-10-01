import React, { useState, useEffect, useRef } from 'react';
import { Delete, KeyRound, Lock, Info, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function LoginPage() {
  const { loginWithPin } = useAuth();
  const { show } = useToast();

  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [shake, setShake] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus invisible input so mobile/desktop keyboard works immediately
    inputRef.current?.focus();
  }, []);

  const triggerError = (msg: string) => {
    setError(msg);
    setShake(true);
    setTimeout(() => {
      setShake(false);
      setPin('');
    }, 600);
  };

  const handleProcessPin = async (inputPin: string) => {
    if (submitting) return;
    setSubmitting(true);
    setError('');

    const res = await loginWithPin(inputPin);
    if (res.error) {
      triggerError(res.error);
      setSubmitting(false);
    } else {
      show('Đăng nhập thành công!', 'success');
    }
  };

  const handleKeyPress = (digit: string) => {
    if (submitting || pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    if (newPin.length === 4) {
      handleProcessPin(newPin);
    }
  };

  const handleDelete = () => {
    if (submitting) return;
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    if (submitting) return;
    setPin('');
    setError('');
  };

  // Keyboard handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (submitting) return;
    if (e.key >= '0' && e.key <= '9') {
      if (pin.length < 4) {
        handleKeyPress(e.key);
      }
    } else if (e.key === 'Backspace') {
      handleDelete();
    } else if (e.key === 'Escape') {
      handleClear();
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center items-center p-4 select-none relative overflow-hidden font-sans text-slate-100"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Background ambient decorative orbs */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 right-1/4 w-60 h-60 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Invisible input to capture native keyboard strokes */}
      <input
        ref={inputRef}
        type="tel"
        pattern="[0-9]*"
        maxLength={4}
        value={pin}
        onChange={() => {}}
        onKeyDown={handleKeyDown}
        className="opacity-0 absolute pointer-events-none w-0 h-0"
        autoFocus
      />

      <div className="w-full max-w-sm z-10 flex flex-col items-center">
        {/* Company Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-emerald-400 p-0.5 shadow-xl shadow-blue-500/20 mb-4">
            <div className="w-full h-full bg-slate-900/90 backdrop-blur-sm rounded-[14px] flex items-center justify-center text-blue-400">
              <KeyRound size={30} className="text-white" />
            </div>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-white uppercase">
            Hưng Thịnh CQT
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium tracking-wide">
            Hệ thống Quản lý Tồn Xuất Nhập Kho
          </p>
        </div>

        {/* PIN Container Card */}
        <div
          className={`w-full bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/40 flex flex-col items-center transition-all ${
            shake ? 'animate-[shake_0.5s_ease-in-out]' : ''
          }`}
        >
          <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold uppercase tracking-wider mb-5">
            <Lock size={14} className="text-emerald-400" />
            <span>Nhập mã PIN 4 chữ số</span>
          </div>

          {/* 4 PIN Dots / Digits Display */}
          <div className="flex items-center justify-center gap-4 mb-6">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              const isActive = pin.length === idx;
              return (
                <div
                  key={idx}
                  className={`w-14 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold transition-all duration-200 ${
                    isFilled
                      ? 'bg-blue-600 text-white border border-blue-400 shadow-lg shadow-blue-500/30 scale-105'
                      : isActive
                      ? 'bg-white/20 border-2 border-emerald-400 text-white shadow-md ring-2 ring-emerald-400/30'
                      : 'bg-white/5 border border-white/10 text-transparent'
                  }`}
                >
                  {isFilled ? '●' : ''}
                </div>
              );
            })}
          </div>

          {/* Status / Error Message */}
          <div className="h-6 mb-4 flex items-center justify-center text-center">
            {error ? (
              <p className="text-xs text-rose-400 font-medium animate-fade-in">{error}</p>
            ) : submitting ? (
              <p className="text-xs text-blue-300 font-medium animate-pulse">
                Đang kiểm tra mã PIN...
              </p>
            ) : (
              <p className="text-xs text-slate-400">Chạm hoặc gõ bàn phím 4 chữ số</p>
            )}
          </div>

          {/* Youthful Touch / Mouse Keypad */}
          <div className="w-full grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeyPress(digit)}
                disabled={submitting}
                className="h-14 rounded-2xl bg-white/5 hover:bg-white/15 active:bg-blue-600/40 border border-white/10 text-xl font-semibold text-white transition-all transform active:scale-95 flex items-center justify-center disabled:opacity-50"
              >
                {digit}
              </button>
            ))}

            {/* Clear Button */}
            <button
              type="button"
              onClick={handleClear}
              disabled={submitting || pin.length === 0}
              className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-400 hover:text-white transition-all transform active:scale-95 flex items-center justify-center disabled:opacity-30"
            >
              XÓA HẾT
            </button>

            {/* 0 Button */}
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              disabled={submitting}
              className="h-14 rounded-2xl bg-white/5 hover:bg-white/15 active:bg-blue-600/40 border border-white/10 text-xl font-semibold text-white transition-all transform active:scale-95 flex items-center justify-center disabled:opacity-50"
            >
              0
            </button>

            {/* Backspace Button */}
            <button
              type="button"
              onClick={handleDelete}
              disabled={submitting || pin.length === 0}
              aria-label="Xóa số trước"
              className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all transform active:scale-95 flex items-center justify-center disabled:opacity-30"
            >
              <Delete size={22} />
            </button>
          </div>
        </div>

        {/* Subtle Hint Collapsible for First-time setup & Admin guidance */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setShowHint(!showHint)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors py-1 px-3 rounded-full hover:bg-white/5"
          >
            <Info size={14} />
            <span>{showHint ? 'Ẩn thông tin mã PIN' : 'Gợi ý mã PIN hệ thống'}</span>
          </button>

          {showHint && (
            <div className="mt-3 p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-left text-xs space-y-2 backdrop-blur-md animate-fade-in shadow-xl max-w-xs">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 size={14} />
                <span>Mã PIN cài sẵn mặc định:</span>
              </div>
              <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-xl">
                <span className="text-slate-300">Quản trị viên (Được nhập liệu):</span>
                <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                  1111
                </span>
              </div>
              <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-xl">
                <span className="text-slate-300">Ban Giám Đốc (Chỉ xem):</span>
                <span className="font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
                  2222
                </span>
              </div>
              <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
                * Quản trị viên có thể tạo thêm, đổi hoặc gán mã 4 số mới trong mục{' '}
                <strong>Tài khoản</strong> sau khi đăng nhập.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
