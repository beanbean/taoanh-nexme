'use client';

import { useState } from 'react';
import type { Player } from '@/types';
import { uploadAvatar } from '@/lib/supabase';

interface PlayerRowProps {
  player: Player;
  index: number;
  hasCaptain: boolean;
  checked: boolean;
  canRestore: boolean;
  onCheckChange: (checked: boolean) => void;
  onChange: (player: Player) => void;
  onDelete: () => void;
  onClearWeights?: () => void;
  onRestoreWeights?: () => void;
}

export default function PlayerRow({ player, index, hasCaptain, checked, canRestore, onCheckChange, onChange, onDelete, onClearWeights, onRestoreWeights }: PlayerRowProps) {
  const [uploading, setUploading] = useState(false);

  function handleChange(field: keyof Player, value: any) {
    onChange({ ...player, [field]: value });
  }

  function handleWeightChange(day: number, value: string) {
    const numValue = value === '' ? null : parseFloat(value);
    const field = `day${day}` as keyof Player;
    onChange({ ...player, [field]: numValue });
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh');
      return;
    }

    setUploading(true);
    const url = await uploadAvatar(file);
    setUploading(false);

    if (url) {
      onChange({ ...player, avatar_url: url });
    } else {
      alert('Lỗi khi tải ảnh lên');
    }
  }

  return (
    <div className="player-row group">
      {/* Main row: checkbox, avatar, name, role, delete */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckChange(e.target.checked)}
          className="checkbox-custom"
        />

        {/* Avatar circle */}
        <div className="relative flex-shrink-0">
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
            id={`avatar-${player.id || `new-${index}`}`}
          />
          <label
            htmlFor={`avatar-${player.id || `new-${index}`}`}
            className="block cursor-pointer"
          >
            {uploading ? (
              <div className="w-10 h-10 rounded-full bg-surface-tertiary border-2 border-dashed border-border flex items-center justify-center">
                <div className="spinner-dark w-4 h-4" />
              </div>
            ) : player.avatar_url ? (
              <img
                src={player.avatar_url}
                alt="Avatar"
                className="w-10 h-10 rounded-full object-cover border-2 border-brand-300 shadow-sm hover:border-brand-500 transition-colors"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-surface-tertiary border-2 border-dashed border-border-light flex flex-col items-center justify-center hover:border-brand-400 hover:bg-brand-50 transition-colors" title="Tải ảnh avatar">
                <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                </svg>
              </div>
            )}
          </label>
        </div>

        {/* Player name */}
        <div className="w-[140px]">
          <input
            type="text"
            value={player.player_name}
            onChange={(e) => handleChange('player_name', e.target.value)}
            onBlur={() => onChange(player)}
            placeholder="Tên"
            maxLength={20}
            className="input-base text-sm"
          />
        </div>

        {/* Role selector */}
        <select
          value={player.role}
          onChange={(e) => handleChange('role', e.target.value)}
          onBlur={() => onChange(player)}
          className="input-base select-custom text-sm w-[130px]"
        >
          <option value="player">Người chơi</option>
          <option value="captain" disabled={hasCaptain && player.role !== 'captain'}>
            Đội trưởng {hasCaptain && player.role !== 'captain' ? '(đã có)' : ''}
          </option>
        </select>

        {/* Delete button */}
        <button
          onClick={onDelete}
          className="btn-danger-sm"
          title="Xóa người chơi"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
          Xóa
        </button>

        {/* Clear weights button — chỉ xóa dữ liệu kg, giữ người chơi */}
        {onClearWeights && player.id && (
          <button
            onClick={onClearWeights}
            className="btn-ghost-outline text-xs px-2 py-1 flex items-center gap-1"
            title="Xóa dữ liệu cân nặng (giữ người chơi)"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Xóa kg
          </button>
        )}

        {/* Restore weights button — phục hồi dữ liệu kg đã xóa */}
        {canRestore && onRestoreWeights && (
          <button
            onClick={onRestoreWeights}
            className="text-xs px-2 py-1 flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
            title="Phục hồi dữ liệu cân nặng vừa xóa"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
            </svg>
            Phục hồi
          </button>
        )}
      </div>

      {/* Weight inputs grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-11 gap-2">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((day) => (
          <div key={day} className="relative">
            <label className="block text-[10px] font-medium text-text-tertiary mb-1">
              {day === 0 ? 'Đầu' : `Ng${day}`}
            </label>
            <input
              type="number"
              step="0.1"
              value={player[`day${day}` as keyof Player] !== null && player[`day${day}` as keyof Player] !== undefined ? (player[`day${day}` as keyof Player] as number) : ''}
              onChange={(e) => handleWeightChange(day, e.target.value)}
              onBlur={() => onChange(player)}
              placeholder="kg"
              className="weight-input"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
