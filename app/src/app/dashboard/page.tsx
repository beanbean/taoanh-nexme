'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getUser, signOut, getDataset, getAllDatasets, upsertDataset, getPlayers, upsertPlayer, clearAllData, deletePlayer, isAdmin, checkApprovalStatus, requestApproval } from '@/lib/supabase';
import type { MarathonDataset, Player, RenderRequest, RenderResponse, RenderedImage, PersonalRenderData, PersonalProgressData, TeamRenderData, TeamPlayerData } from '@/types';
import PlayerRow from '@/components/PlayerRow';
import ImagePreview from '@/components/ImagePreview';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState(false);

  const [dataset, setDataset] = useState<MarathonDataset>({
    team_name: '',
    round_name: 'Marathon',
    round_number: null,
    time_range: '',
  });
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [allDatasets, setAllDatasets] = useState<MarathonDataset[]>([]);
  const [showNewDataset, setShowNewDataset] = useState(false);

  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [imageType, setImageType] = useState<'personal' | 'team'>('personal');
  const [selectedDay, setSelectedDay] = useState<number>(-1);
  const [renderedImages, setRenderedImages] = useState<RenderedImage[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    initUser();
  }, []);

  async function initUser() {
    const { user: currentUser } = await getUser();
    if (!currentUser) {
      router.push('/');
      return;
    }

    setUser(currentUser);

    // Admin bypass - always approved
    if (isAdmin(currentUser.email)) {
      setApprovalStatus('approved');
      await loadData(currentUser.id);
      setLoading(false);
      return;
    }

    // Check approval status
    const { status, needsRequest } = await checkApprovalStatus(currentUser.id);

    if (needsRequest) {
      // Create approval request for new user
      await requestApproval(currentUser);
      setApprovalStatus('pending');
      setLoading(false);
      return;
    }

    setApprovalStatus(status);

    // Only load data if approved
    if (status === 'approved') {
      await loadData(currentUser.id);
    }

    setLoading(false);
  }

  async function loadData(userId: string) {
    const datasets = await getAllDatasets(userId);
    setAllDatasets(datasets);
    if (datasets.length > 0) {
      const latest = datasets[0];
      setDataset(latest);
      setDatasetId(latest.id || null);
      const existingPlayers = await getPlayers(latest.id!);
      setPlayers(existingPlayers);
      const allIds = existingPlayers.filter(p => p.id).map(p => p.id!);
      setSelectedPlayers(new Set(allIds));
    }
  }

  async function switchDataset(dsId: string) {
    if (!user) return;
    const ds = allDatasets.find(d => d.id === dsId);
    if (ds) {
      setDataset(ds);
      setDatasetId(ds.id || null);
      const existingPlayers = await getPlayers(ds.id!);
      setPlayers(existingPlayers);
      const allIds = existingPlayers.filter(p => p.id).map(p => p.id!);
      setSelectedPlayers(new Set(allIds));
    }
  }

  function startNewDataset() {
    setDataset({
      team_name: '',
      round_name: 'Marathon',
      round_number: null,
      time_range: '',
    });
    setDatasetId(null);
    setPlayers([]);
    setSelectedPlayers(new Set());
    setShowNewDataset(true);
  }

  const saveDataset = useCallback(async (updatedDataset: MarathonDataset) => {
    if (!user) return;
    setSaving(true);
    const id = await upsertDataset(updatedDataset, user.id);
    if (id && !datasetId) {
      setDatasetId(id);
      setDataset({ ...updatedDataset, id });
      setShowNewDataset(false);
      const datasets = await getAllDatasets(user.id);
      setAllDatasets(datasets);
    }
    setSaving(false);
  }, [user, datasetId]);

  const savePlayer = useCallback(async (player: Player, index: number) => {
    let targetDatasetId = datasetId;
    if (!targetDatasetId && user) {
      const id = await upsertDataset(dataset, user.id);
      if (id) {
        setDatasetId(id);
        setDataset({ ...dataset, id });
        targetDatasetId = id;
      }
    }
    if (targetDatasetId) {
      const playerId = await upsertPlayer(player, targetDatasetId);
      if (playerId && !player.id) {
        setPlayers(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], id: playerId };
          return updated;
        });
      }
    }
  }, [datasetId, user, dataset]);

  function handleDatasetChange(field: keyof MarathonDataset, value: any) {
    const updated = { ...dataset, [field]: value };
    setDataset(updated);
  }

  function handleDatasetBlur() {
    if (dataset.team_name || dataset.time_range) {
      saveDataset(dataset);
    }
  }

  const MAX_PLAYERS = 9;

  function addPlayer() {
    if (!dataset.team_name) {
      alert('Vui lòng nhập tên đội chơi trước khi thêm người chơi.\n\nMỗi người chơi phải thuộc một đội chơi.');
      return;
    }

    if (players.length >= MAX_PLAYERS) {
      alert(`Đội "${dataset.team_name}" đã đủ ${MAX_PLAYERS} người chơi (1 đội trưởng + 8 thành viên).\n\nVui lòng tạo đội chơi mới để nhập thêm người.`);
      return;
    }
    const newPlayer: Player = {
      player_name: '',
      role: 'player',
      avatar_url: null,
      day0: null, day1: null, day2: null, day3: null, day4: null,
      day5: null, day6: null, day7: null, day8: null, day9: null, day10: null,
    };
    setPlayers([newPlayer, ...players]);
  }

  function handlePlayerChange(index: number, updatedPlayer: Player) {
    const updated = [...players];
    updated[index] = updatedPlayer;
    setPlayers(updated);
    savePlayer(updatedPlayer, index);
  }

  function handlePlayerCheck(index: number, checked: boolean) {
    const player = players[index];
    if (!player.id) return;

    const newSelected = new Set(selectedPlayers);
    if (checked) {
      newSelected.add(player.id);
    } else {
      newSelected.delete(player.id);
    }
    setSelectedPlayers(newSelected);
  }

  async function handleDeletePlayer(index: number) {
    const player = players[index];
    if (player.id) {
      const success = await deletePlayer(player.id);
      if (!success) {
        alert('Lỗi khi xóa người chơi');
        return;
      }
    }
    const updated = players.filter((_, i) => i !== index);
    setPlayers(updated);
    if (player.id) {
      selectedPlayers.delete(player.id);
      setSelectedPlayers(new Set(selectedPlayers));
    }
  }

  // Return avatar URL directly - render API fetches avatars server-side
  function getAvatarUrl(url: string | null): string {
    if (!url || url.trim() === '') return '';
    return url;
  }

  function buildPlayerGrid(player: Player): Array<{ day: number; delta_from_start: number | null }> {
    const grid = [];
    for (let i = 1; i <= 10; i++) {
      let delta_from_start: number | null = null;
      if (i <= selectedDay) {
        const dayWeight = player[`day${i}` as keyof Player] as number | null;
        if (dayWeight !== null && dayWeight !== undefined) {
          // Find the nearest previous day with weight data
          let prevWeight: number | null = null;
          for (let d = i - 1; d >= 0; d--) {
            const w = player[`day${d}` as keyof Player] as number | null;
            if (w !== null && w !== undefined) {
              prevWeight = w;
              break;
            }
          }
          if (prevWeight !== null) {
            delta_from_start = dayWeight - prevWeight;
          }
        }
      }
      grid.push({ day: i, delta_from_start });
    }
    return grid;
  }

  function buildPlayerStats(player: Player): { start_weight: number | null; current_weight: number | null; delta_weight: number | null } {
    // Find the first day with weight data as start weight
    let startWeight: number | null = null;
    for (let i = 0; i <= selectedDay; i++) {
      const w = player[`day${i}` as keyof Player] as number | null;
      if (w !== null && w !== undefined) {
        startWeight = w;
        break;
      }
    }
    // Find the latest day with weight data as current weight
    let currentWeight: number | null = null;
    for (let i = selectedDay; i >= 0; i--) {
      const w = player[`day${i}` as keyof Player] as number | null;
      if (w !== null && w !== undefined) {
        currentWeight = w;
        break;
      }
    }
    const deltaWeight = (startWeight !== null && currentWeight !== null) ? currentWeight - startWeight : null;
    return { start_weight: startWeight, current_weight: currentWeight, delta_weight: deltaWeight };
  }

  async function handleGenerateImages() {
    if (selectedDay < 0) {
      alert('Vui lòng chọn ngày hiện tại để tạo ảnh');
      return;
    }
    if (!dataset.team_name) {
      alert('Vui lòng nhập tên đội');
      return;
    }

    setRendering(true);
    const images: RenderedImage[] = [];

    try {
      if (imageType === 'personal') {
        const selectedPlayersList = players.filter(p => p.id && selectedPlayers.has(p.id));
        if (selectedPlayersList.length === 0) {
          alert('Vui lòng chọn ít nhất một người chơi');
          setRendering(false);
          return;
        }

        for (const player of selectedPlayersList) {
          const avatarUrl = getAvatarUrl(player.avatar_url);

          // Template expects: player.name, player.team, player.avatar, player.round_name, player.info_line
          // Also expects: stats (start_weight, current_weight, delta_weight), player.grid array
          const isFinished = selectedDay === 10;
          const playerStats = buildPlayerStats(player);

          const renderData = {
            player: {
              name: player.player_name || 'Người chơi',
              team: dataset.team_name || 'Đội',
              avatar: avatarUrl || 'https://ui-avatars.com/api/?name=User',
              round_name: dataset.round_name || 'Marathon',
              info_line: dataset.time_range || '',
              grid: buildPlayerGrid(player)
            },
            stats: isFinished
              ? playerStats
              : { start_weight: playerStats.start_weight, current_weight: null, delta_weight: playerStats.delta_weight },
            is_finished: isFinished
          };

          const request: RenderRequest = {
            template: 'personal_progress.hbs',
            filename_prefix: 'personal',
            width: 1080,
            height: 1444,
            data: renderData,
          };

          const response = await fetch('/api/render', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
          });

          const result: RenderResponse = await response.json();
          if (result.success && result.image_url) {
            images.push({
              url: result.image_url,
              filename: result.filename || 'image.png',
              playerName: player.player_name,
            });
          } else {
            console.error('[Render] Failed for player:', player.player_name, result.error);
          }
        }
      } else {
        const teamData = await calculateTeamData(selectedDay);

        const request: RenderRequest = {
          template: 'daily_leaderboard.hbs',
          filename_prefix: 'team_leader',
          width: 1080,
          height: 1920,
          data: teamData,
        };

        const response = await fetch('/api/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        const result: RenderResponse = await response.json();
        if (result.success && result.image_url) {
          images.push({
            url: result.image_url,
            filename: result.filename || 'team.png',
          });
        } else {
          console.error('[Render] Team render failed:', result.error);
        }
      }

      setRenderedImages(images);
      if (images.length > 0) {
        setShowPreview(true);
      } else {
        alert('Không thể tạo ảnh. Server render có thể đang gặp sự cố. Vui lòng thử lại sau.');
      }
    } catch (error) {
      console.error('Error generating images:', error);
      alert('Lỗi khi tạo ảnh. Vui lòng thử lại.');
    } finally {
      setRendering(false);
    }
  }

  async function calculateTeamData(dayNumber: number): Promise<TeamRenderData> {
    const playerData: TeamPlayerData[] = [];
    let teamTodayLoss = 0;

    for (const player of players) {
      // Find the latest weight for this player
      let latestWeight: number | null = null;
      let latestDay = -1;
      for (let d = dayNumber; d >= 0; d--) {
        const w = player[`day${d}` as keyof Player] as number | null;
        if (w !== null && w !== undefined) {
          latestWeight = w;
          latestDay = d;
          break;
        }
      }

      // Find the first day with weight data as start weight
      let startWeight: number | null = null;
      for (let d = 0; d <= dayNumber; d++) {
        const w = player[`day${d}` as keyof Player] as number | null;
        if (w !== null && w !== undefined) {
          startWeight = w;
          break;
        }
      }
      const isCaptain = player.role === 'captain';

      // Skip players without any weight data
      if (startWeight === null && latestWeight === null) continue;

      const todayWeight = player[`day${dayNumber}` as keyof Player] as number | null;
      // Find nearest previous day with weight data
      let yesterdayWeight: number | null = null;
      for (let d = dayNumber - 1; d >= 0; d--) {
        const w = player[`day${d}` as keyof Player] as number | null;
        if (w !== null && w !== undefined) {
          yesterdayWeight = w;
          break;
        }
      }

      const todayLoss = (todayWeight !== null && yesterdayWeight !== null) ? yesterdayWeight - todayWeight : 0;
      const roundLoss = (startWeight !== null && latestWeight !== null) ? startWeight - latestWeight : 0;

      if (!isCaptain) {
        teamTodayLoss += todayLoss;
      }

      const avatarUrl = getAvatarUrl(player.avatar_url);

      playerData.push({
        name: player.player_name || 'Người chơi',
        avatar: avatarUrl || 'https://ui-avatars.com/api/?name=User',
        rank: '0',
        today_display: isCaptain ? '' : (todayLoss >= 0 ? `-${todayLoss.toFixed(1)}` : `+${Math.abs(todayLoss).toFixed(1)}`),
        round_display: isCaptain ? '' : (roundLoss >= 0 ? `-${roundLoss.toFixed(1)}` : `+${Math.abs(roundLoss).toFixed(1)}`),
        is_captain: isCaptain,
        is_top: false,
      });
    }

    // Sort non-captain players by today_display (most daily weight loss first)
    const captains = playerData.filter(p => p.is_captain);
    const members = playerData.filter(p => !p.is_captain);

    members.sort((a, b) => {
      const aLoss = parseFloat(a.today_display);
      const bLoss = parseFloat(b.today_display);
      return aLoss - bLoss;
    });

    members.forEach((player, index) => {
      player.rank = (index + 1).toString();
    });

    // Mark the top player(s) - handle ties (cùng điểm thì cùng có vương miện)
    if (members.length > 0) {
      const topLoss = members[0].today_display;
      members.forEach(player => {
        if (player.today_display === topLoss) {
          player.is_top = true;
        }
      });
    }

    // Members first, then captains at the bottom
    const sortedPlayers = [...members, ...captains];

    return {
      team_name: dataset.team_name,
      round_number: dataset.round_number?.toString() || dataset.round_name,
      day_number: dayNumber,
      team_today_loss: Math.round(teamTodayLoss * 10) / 10,
      players: sortedPlayers,
    };
  }

  async function handleClearData() {
    if (!confirm('Bạn có chắc chắn muốn xóa tất cả dữ liệu? Hành động này không thể hoàn tác.')) {
      return;
    }

    if (!user) return;

    const success = await clearAllData(user.id);
    if (success) {
      setDataset({
        team_name: '',
        round_name: 'Marathon',
        round_number: null,
        time_range: '',
      });
      setDatasetId(null);
      setPlayers([]);
      setSelectedPlayers(new Set());
      alert('Đã xóa tất cả dữ liệu');
    } else {
      alert('Lỗi khi xóa dữ liệu');
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner-dark w-8 h-8 border-[3px]" />
      </div>
    );
  }

  // Pending approval
  if (approvalStatus === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100/60 px-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand-200/30 blur-3xl" />
          <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] rounded-full bg-brand-100/40 blur-3xl" />
        </div>
        <div className="relative w-full max-w-sm fade-in">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-elevated">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
          </div>
          <div className="card p-8 text-center">
            <h1 className="text-xl font-bold text-text-primary mb-2">Chờ duyệt</h1>
            <p className="text-sm text-text-secondary leading-relaxed mb-6">
              Tài khoản của bạn đang chờ được admin phê duyệt. Vui lòng quay lại sau.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-text-tertiary mb-6 p-3 bg-surface-tertiary rounded-lg">
              {user?.user_metadata?.avatar_url && (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Avatar"
                  className="w-6 h-6 rounded-full"
                  referrerPolicy="no-referrer"
                />
              )}
              <span>{user?.email}</span>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-brand-50 border border-brand-200 rounded-[10px] font-medium text-sm text-brand-700 hover:bg-brand-100 transition-all mb-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Kiem tra lai
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-surface border border-border rounded-[10px] font-medium text-sm text-text-primary hover:bg-surface-tertiary transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
              </svg>
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Rejected
  if (approvalStatus === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-100/60 px-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-red-200/30 blur-3xl" />
          <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] rounded-full bg-red-100/40 blur-3xl" />
        </div>
        <div className="relative w-full max-w-sm fade-in">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-elevated">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>
          <div className="card p-8 text-center">
            <h1 className="text-xl font-bold text-text-primary mb-2">Truy cap bi tu choi</h1>
            <p className="text-sm text-text-secondary leading-relaxed mb-6">
              Tai khoan cua ban da bi tu choi truy cap. Vui long lien he admin de biet them chi tiet.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-text-tertiary mb-6 p-3 bg-surface-tertiary rounded-lg">
              {user?.user_metadata?.avatar_url && (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Avatar"
                  className="w-6 h-6 rounded-full"
                  referrerPolicy="no-referrer"
                />
              )}
              <span>{user?.email}</span>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-surface-tertiary border border-border rounded-[10px] font-medium text-sm text-text-primary hover:bg-surface-secondary transition-all mb-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Kiem tra lai
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-surface border border-border rounded-[10px] font-medium text-sm text-text-primary hover:bg-surface-tertiary transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
              </svg>
              Dang xuat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-secondary pb-12">
      {/* Header */}
      <header className="bg-surface border-b border-border-light">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="Nexme" className="w-8 h-8" />
              <span className="font-semibold text-sm text-text-primary">Nexme Marathon</span>
            </div>

            <div className="flex items-center gap-2">
              {saving && (
                <div className="flex items-center gap-2 text-xs text-text-tertiary">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 save-pulse" />
                  <span>Đang lưu</span>
                </div>
              )}
              {user && isAdmin(user.email) && (
                <button
                  onClick={() => router.push('/admin')}
                  className="btn-header"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                  Admin
                </button>
              )}
              {user?.user_metadata?.avatar_url && (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Avatar"
                  className="w-7 h-7 rounded-full border-2 border-brand-200 object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
              <button
                onClick={handleSignOut}
                className="btn-header"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-surface border-b border-border-light">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Step 1 */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${dataset.team_name ? 'bg-brand-500 text-white' : 'bg-surface-tertiary text-text-tertiary'}`}>
                1
              </div>
              <span className={`text-sm font-medium ${dataset.team_name ? 'text-brand-600' : 'text-text-tertiary'}`}>Thông tin đội</span>
            </div>
            {/* Arrow */}
            <svg className="w-5 h-5 text-border flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
            {/* Step 2 */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${players.length > 0 ? 'bg-brand-500 text-white' : 'bg-surface-tertiary text-text-tertiary'}`}>
                2
              </div>
              <span className={`text-sm font-medium ${players.length > 0 ? 'text-brand-600' : 'text-text-tertiary'}`}>Thêm người chơi</span>
            </div>
            {/* Arrow */}
            <svg className="w-5 h-5 text-border flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
            {/* Step 3 */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${selectedPlayers.size > 0 ? 'bg-brand-500 text-white' : 'bg-surface-tertiary text-text-tertiary'}`}>
                3
              </div>
              <span className={`text-sm font-medium ${selectedPlayers.size > 0 ? 'text-brand-600' : 'text-text-tertiary'}`}>Chọn người</span>
            </div>
            {/* Arrow */}
            <svg className="w-5 h-5 text-border flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
            {/* Step 4 */}
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold bg-surface-tertiary text-text-tertiary">
                4
              </div>
              <span className="text-sm font-medium text-text-tertiary">Tạo ảnh</span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 mt-6 space-y-5">

        {/* Team Selector */}
        {allDatasets.length > 0 && (
          <section className="card p-4 fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-xs font-medium text-text-secondary whitespace-nowrap">Chọn đội</label>
              <div className="flex-1 flex gap-2">
                <select
                  value={datasetId || ''}
                  onChange={(e) => switchDataset(e.target.value)}
                  className="input-base select-custom flex-1"
                >
                  {allDatasets.map(ds => (
                    <option key={ds.id} value={ds.id!}>
                      {ds.team_name || '(Chưa đặt tên)'} - Vòng {ds.round_number || ds.round_name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={startNewDataset}
                  className="btn-primary px-4"
                >
                  + Đội mới
                </button>
              </div>
            </div>
          </section>
        )}

        {/* STEP 1: Team Info */}
        <section className="card p-5 fade-in">
          <h2 className="text-base font-semibold text-text-primary mb-1 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">1</span>
            <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44z" />
            </svg>
            Thông tin đội
          </h2>
          <p className="text-xs text-text-tertiary mb-4 ml-8">Nhập tên đội và thông tin vòng thi của bạn</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Tên đội
              </label>
              <input
                type="text"
                value={dataset.team_name}
                onChange={(e) => handleDatasetChange('team_name', e.target.value)}
                onBlur={handleDatasetBlur}
                className="input-base"
                placeholder="Ví dụ: Đội Hổ Con"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Tên vòng
              </label>
              <input
                type="text"
                value={dataset.round_name}
                onChange={(e) => handleDatasetChange('round_name', e.target.value)}
                onBlur={handleDatasetBlur}
                className="input-base"
                placeholder="Ví dụ: Marathon"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Số vòng
              </label>
              <input
                type="number"
                value={dataset.round_number || ''}
                onChange={(e) => handleDatasetChange('round_number', e.target.value ? parseInt(e.target.value) : null)}
                onBlur={handleDatasetBlur}
                className="input-base"
                placeholder="Ví dụ: 7"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Thời gian
              </label>
              <input
                type="text"
                value={dataset.time_range}
                onChange={(e) => handleDatasetChange('time_range', e.target.value)}
                onBlur={handleDatasetBlur}
                className="input-base"
                placeholder="Ví dụ: 1/2-10/2/26"
              />
            </div>
          </div>
        </section>

        {/* STEP 2: Player List */}
        <section className="card p-5 fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">2</span>
                <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
                Danh sách người chơi
              </h2>
              <p className="text-xs text-text-tertiary mt-0.5 ml-8">
                {players.length > 0 ? `${players.length}/${MAX_PLAYERS} người` : 'Chưa có người chơi'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const allIds = players.filter(p => p.id).map(p => p.id!);
                  setSelectedPlayers(new Set(allIds));
                }}
                className="btn-outline"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                Chọn tất cả
              </button>
              <button
                onClick={() => setSelectedPlayers(new Set())}
                className="btn-ghost-outline"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
                Bỏ chọn
              </button>
              <button
                onClick={addPlayer}
                disabled={players.length >= MAX_PLAYERS}
                className="btn-primary px-3 py-2 text-xs flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Thêm người
              </button>
            </div>
          </div>

          {/* Helper hint */}
          {players.length === 0 && (
            <div className="mb-4 p-3 bg-brand-50 rounded-lg border border-brand-100">
              <p className="text-sm text-brand-700 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 5.482-5.358A6.002 6.002 0 0 0 6.002 6a6.002 6.002 0 0 0-5.482 6.392A6.01 6.01 0 0 0 12 12.75Z" />
                </svg>
                Nhấn <span className="font-bold">"Thêm người"</span> để bắt đầu thêm người chơi vào đội
              </p>
            </div>
          )}

          {players.length >= MAX_PLAYERS && (
            <div className="mb-4 p-3 bg-brand-50 rounded-lg border border-brand-100 flex items-start gap-2">
              <svg className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <p className="text-xs text-brand-700">
                Đội đã đủ {MAX_PLAYERS} người chơi. Tạo đội mới để thêm người chơi.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {players.map((player, index) => (
              <PlayerRow
                key={player.id || index}
                player={player}
                index={index}
                hasCaptain={players.some((p, i) => i !== index && p.role === 'captain')}
                checked={player.id ? selectedPlayers.has(player.id) : false}
                onCheckChange={(checked) => handlePlayerCheck(index, checked)}
                onChange={(updated) => handlePlayerChange(index, updated)}
                onDelete={() => handleDeletePlayer(index)}
              />
            ))}
            {players.length === 0 && (
              <div className="text-center py-10">
                <div className="inline-flex w-12 h-12 rounded-full bg-surface-tertiary items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                  </svg>
                </div>
                <p className="text-sm text-text-tertiary">
                  Chưa có người chơi. Nhấn <span className="font-medium text-text-secondary">+ Thêm</span> để bắt đầu.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* STEP 3: Player Selection for Image Generation */}
        <section className="card p-5 fade-in">
          <h2 className="text-base font-semibold text-text-primary mb-1 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">3</span>
            <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            Chọn người chơi để tạo ảnh
          </h2>
          <p className="text-xs text-text-tertiary mb-4 ml-8">
            {imageType === 'personal'
              ? 'Chọn người chơi cần tạo ảnh cá nhân. Mỗi người sẽ có 1 ảnh riêng.'
              : 'Ảnh đội sẽ bao gồm tất cả người chơi có dữ liệu cân nặng.'}
          </p>

          {/* Image Type Selector */}
          <div className="mb-5">
            <div className="segment-control">
              <button
                type="button"
                className="segment-option"
                data-active={imageType === 'personal'}
                onClick={() => setImageType('personal')}
              >
                Ảnh cá nhân
              </button>
              <button
                type="button"
                className="segment-option"
                data-active={imageType === 'team'}
                onClick={() => setImageType('team')}
              >
                Ảnh đội
              </button>
            </div>
          </div>

          {/* Day Selector */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Chọn ngày hiện tại để tạo ảnh <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(parseInt(e.target.value))}
              className="input-base"
            >
              <option value={-1} disabled>-- Chọn ngày --</option>
              {Array.from({ length: 11 }, (_, i) => (
                <option key={i} value={i}>
                  Ngày {i} {i === 0 ? '(Bắt đầu)' : i === 10 ? '(Kết thúc marathon)' : ''}
                </option>
              ))}
            </select>
            {selectedDay >= 0 && (
              <p className="text-xs text-text-tertiary mt-1.5">
                Ảnh sẽ chỉ hiển thị dữ liệu từ ngày 0 đến ngày {selectedDay}. Dữ liệu sau ngày {selectedDay} sẽ không được tính.
              </p>
            )}
          </div>

          {/* Player Selection List (only for personal images) */}
          {imageType === 'personal' && players.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-text-primary">
                  Chọn người chơi ({selectedPlayers.size}/{players.filter(p => p.id).length} đã chọn)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const allIds = players.filter(p => p.id).map(p => p.id!);
                      setSelectedPlayers(new Set(allIds));
                    }}
                    className="btn-outline"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    Chọn tất cả
                  </button>
                  <button
                    onClick={() => setSelectedPlayers(new Set())}
                    className="btn-ghost-outline"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                    Bỏ chọn
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {players.map((player, index) => {
                  if (!player.id) return null;
                  const isSelected = selectedPlayers.has(player.id);
                  return (
                    <label
                      key={player.id || index}
                      className={`player-select-card ${isSelected ? 'selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handlePlayerCheck(index, e.target.checked)}
                        className="checkbox-custom"
                      />
                      {player.avatar_url ? (
                        <img
                          src={player.avatar_url}
                          alt={player.player_name}
                          className="w-8 h-8 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-surface-tertiary flex items-center justify-center border border-border">
                          <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isSelected ? 'text-brand-700' : 'text-text-primary'}`}>
                          {player.player_name || '(Chưa có tên)'}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          {player.role === 'captain' ? 'Đội trưởng' : 'Người chơi'}
                          {player.avatar_url && <span className="ml-1" style={{color: '#22c55e'}}>- Có avatar</span>}
                        </p>
                      </div>
                      {isSelected && (
                        <svg className="w-5 h-5 flex-shrink-0" style={{color: '#22c55e'}} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      )}
                    </label>
                  );
                })}
              </div>
              {selectedPlayers.size === 0 && (
                <div className="mt-3 p-3 bg-danger-50 rounded-lg border border-danger-500/20">
                  <p className="text-sm text-danger-500 flex items-center gap-2 font-medium">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    Cần chọn ít nhất 1 người chơi để tạo ảnh cá nhân
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Team image hint */}
          {imageType === 'team' && (
            <div className="mb-5 p-3 bg-brand-50 rounded-lg border border-brand-100">
              <p className="text-sm text-brand-700 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                </svg>
                Ảnh đội sẽ hiển thị bảng xếp hạng tất cả người chơi có dữ liệu cân nặng
              </p>
            </div>
          )}

          {/* No players warning */}
          {players.length === 0 && (
            <div className="mb-5 p-4 bg-surface-tertiary rounded-xl border border-border-light text-center">
              <svg className="w-8 h-8 mx-auto text-text-tertiary mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
              <p className="text-sm text-text-tertiary font-medium">
                Thêm người chơi ở Bước 2 trước khi tạo ảnh
              </p>
            </div>
          )}
        </section>

        {/* STEP 4: Image Generation */}
        <section className="card p-5 fade-in">
          <h2 className="text-base font-semibold text-text-primary mb-1 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">4</span>
            <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
            Tạo ảnh
          </h2>
          <p className="text-xs text-text-tertiary mb-4 ml-8">Nhấn nút bên dưới để tạo ảnh cho đội của bạn</p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleGenerateImages}
              disabled={rendering || players.length === 0 || (imageType === 'personal' && selectedPlayers.size === 0)}
              className="flex-1 btn-primary py-4 text-base flex items-center justify-center gap-2"
            >
              {rendering ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner w-5 h-5" />
                  Đang tạo ảnh...
                </span>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                  TẠO ẢNH {imageType === 'personal' ? `(${selectedPlayers.size} người)` : '(Bảng xếp hạng đội)'}
                </>
              )}
            </button>
            <button
              onClick={handleClearData}
              className="btn-danger px-5 py-4 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
              XÓA DỮ LIỆU
            </button>
          </div>
        </section>

      </main>

      {showPreview && (
        <ImagePreview
          images={renderedImages}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
