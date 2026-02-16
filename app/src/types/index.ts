export interface MarathonDataset {
  id?: string;
  user_id?: string;
  team_name: string;
  round_name: string;
  round_number: number | null;
  time_range: string;
  created_at?: string;
  updated_at?: string;
}

export interface Player {
  id?: string;
  dataset_id?: string;
  player_name: string;
  role: 'player' | 'captain';
  avatar_url: string | null;
  day0: number | null;
  day1: number | null;
  day2: number | null;
  day3: number | null;
  day4: number | null;
  day5: number | null;
  day6: number | null;
  day7: number | null;
  day8: number | null;
  day9: number | null;
  day10: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface PersonalRenderData {
  player_name: string;
  team: string;
  avatar_url: string;
  round_name: string;
  time_range: string;
  day0: number | null;
  day1: number | null;
  day2: number | null;
  day3: number | null;
  day4: number | null;
  day5: number | null;
  day6: number | null;
  day7: number | null;
  day8: number | null;
  day9: number | null;
  day10: number | null;
}

// New structure for personal_progress.hbs template
export interface PersonalProgressData {
  player: {
    name: string;
    team: string;
    avatar: string;
    round_name: string;
    info_line: string;
    grid: Array<{
      day: number;
      delta_from_start: number | null;
    }>;
  };
  stats: {
    start_weight: number | null;
    current_weight: number | null;
    delta_weight: number | null;
  };
  is_finished: boolean;
}

export interface TeamPlayerData {
  name: string;
  avatar: string;
  rank: string;
  today_display: string;
  round_display: string;
  is_captain?: boolean;
  is_top?: boolean;
}

export interface TeamRenderData {
  team_name: string;
  round_number: string;
  day_number: number;
  team_today_loss: number;
  players: TeamPlayerData[];
}

export interface RenderRequest {
  template: string;
  filename_prefix: string;
  width: number;
  height: number;
  data: PersonalRenderData | PersonalProgressData | TeamRenderData;
}

export interface RenderResponse {
  success: boolean;
  image_url?: string;
  filename?: string;
  error?: string;
}

export interface RenderedImage {
  url: string;
  filename: string;
  playerName?: string;
}
