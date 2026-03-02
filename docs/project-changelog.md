# Project Changelog - taoanh.nexme.vn

**Current Version:** Production (2026-03-02)

All significant changes, features, and fixes are documented here in reverse chronological order.

---

## [2026-03-02] Weight Calculation & UI Updates

### Changes

#### Fix: Weight Calculation Logic
**Impact:** HIGH - Core business logic change

**Summary:**
Changed weight calculation to handle missing data days gracefully. Instead of assuming all days have data, the system now finds the nearest previous day with data for daily delta calculations.

**Files Modified:**
- `app/src/app/dashboard/page.tsx`

**Changes:**
1. **`buildPlayerStats()` function**
   - Start weight: Now finds **first day with data** (0 to selectedDay), not always day0
   - Current weight: Finds **latest day with data** (selectedDay to 0), not always latest day
   - Allows sparse weight data where some days are missing

2. **`buildPlayerGrid()` function**
   - Daily delta: Changed from strict day[N-1] to **nearest previous day with data**
   - For each day N:
     - If N has weight and N has previous day with weight
     - Then delta = day[N] - nearest_previous_day_with_data
     - Not delta = day[N] - day[N-1] (which would be null if day[N-1] missing)

3. **`calculateTeamData()` function**
   - **Today loss:** Changed from strict day[N-1] to nearest previous day with data
   - **Round loss:** Uses first day with data as start weight (not always day0)
   - Handles cases where players started entering data after day 0

4. **`buildPlayerStats()` render logic**
   - `current_weight` field now hidden unless `selectedDay === 10` (is_finished)
   - `delta_weight` always shown (daily change from start)
   - Allows showing progress even on incomplete days

#### Fix: Grid Delta Shows Daily Change vs Total
**Impact:** MEDIUM - UI display fix

**Previous Behavior:**
- Grid showed delta_from_start (change from first day with any weight)
- Confusing for users: looked like cumulative from day 0, but actually from first data entry

**New Behavior:**
- Grid shows **daily delta** (change from previous day with data)
- More intuitive: users see day-to-day progress/loss
- Matches what leaderboard displays as "today_display"

#### Fix: Sort Leaderboard by Daily Weight Loss
**Impact:** MEDIUM - Leaderboard ranking change

**Previous Behavior:**
- Sorted by round_loss (total loss from start to latest)
- Didn't show who lost most weight today

**New Behavior:**
- Sorted by `todayLoss` descending (most daily loss = rank 1)
- Ranks players by their daily progress (more motivating)
- Same players may have different ranks on different days

#### Fix: Always Show Delta Weight
**Impact:** MEDIUM - UI display fix

**Previous Behavior:**
- Delta weight only shown in certain conditions

**New Behavior:**
- `delta_weight` always included in render data
- `current_weight` only included when `is_finished` (selectedDay === 10)
- Allows showing partial progress images

#### Fix: is_finished Based on selectedDay === 10
**Impact:** LOW - State flag change

**Previous Behavior:**
- `is_finished` determined by presence of data in database

**New Behavior:**
- `is_finished = (selectedDay === 10)`
- Simple, deterministic flag
- Matches user intent (selected day 10 = marathon finished)

#### Fix: Day Selector Label
**Impact:** LOW - UI label change

**Change:**
- Old label: `"Chọn ngày hiện tại"` (Select current day)
- New label: `"Chọn ngày hiện tại để tạo ảnh"` (Select current day to create image)
- More explicit about purpose

#### Fix: Day Selection Required
**Impact:** MEDIUM - Validation change

**Previous Behavior:**
- Could generate images without selecting a day
- Defaulted to day 10 if not selected

**New Behavior:**
- `selectedDay < 0` check before generating
- Shows alert: `"Vui lòng chọn ngày hiện tại để tạo ảnh"`
- Requires explicit day selection
- `selectedDay` starts at `-1`, must be set to 0-10

#### Fix: Show Delta Weight When Start = Current
**Impact:** LOW - Edge case fix

**Previous Behavior:**
- If start_weight === current_weight (delta = 0), might not display

**New Behavior:**
- Shows `delta_weight: 0` (no weight change, but tracked)
- Allows displaying images for players with stable weight

### Technical Details

#### Weight Data Example
```
Player data: day0: null, day1: 70kg, day2: null, day3: 68kg, day4: 67kg
selectedDay: 4

buildPlayerStats():
  startWeight = 70 (first with data, day 1)
  currentWeight = 67 (latest with data, day 4)
  deltaWeight = -3

buildPlayerGrid():
  day1: delta = null (no previous day with data)
  day2: delta = null (day 2 missing)
  day3: delta = 68 - 70 = -2 (from day 1)
  day4: delta = 67 - 68 = -1 (from day 3)
```

#### Team Leaderboard Example
```
Player A: day0: null, day1: 70kg, day2: null, day3: 68kg, day4: 67kg
Player B: day0: 75kg, day1: null, day2: 73kg, day3: null, day4: 72kg
selectedDay: 4

calculateTeamData(4):
  Player A:
    startWeight = 70 (first, day 1)
    latestWeight = 67 (latest ≤ day 4, day 4)
    yesterdayWeight = 68 (nearest previous, day 3)
    todayLoss = 68 - 67 = 1
    roundLoss = 70 - 67 = 3

  Player B:
    startWeight = 75 (first, day 0)
    latestWeight = 72 (latest ≤ day 4, day 4)
    yesterdayWeight = 73 (nearest previous, day 2)
    todayLoss = 73 - 72 = 1
    roundLoss = 75 - 72 = 3

  Ranking: Tie on todayLoss, both show "-1.0kg today"
```

### Testing Notes

- Test with incomplete player data (missing middle days)
- Test with players starting after day 0
- Verify leaderboard sorts by todayLoss correctly
- Verify personal images show correct deltas
- Check that images render properly with new data structure

### Breaking Changes

None - this is a pure improvement to logic, no API changes.

### Migration Notes

No database migration needed. All changes are calculation-based.

---

## [2026-01-XX] Previous Releases

[To be filled with historical changes as documentation grows]

---

## Version History

| Version | Date | Status | Notes |
|---------|------|--------|-------|
| Production | 2026-03-02 | Current | Weight calculation fixes |
| MVP | 2026-02-16 | Released | Initial production launch |

## Known Issues

- None currently identified

## Future Roadmap

- [ ] Multi-language support (English, Vietnamese)
- [ ] Enhanced admin dashboard features
- [ ] Batch image generation
- [ ] Advanced analytics for teams
- [ ] API for external integrations
- [ ] Comprehensive test suite

## Deprecations

None at this time.
