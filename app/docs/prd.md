---
stepsCompleted: [step-01-init, step-02-discovery, step-03-success, step-04-metrics, step-05-personas, step-06-user-stories, step-07-frs, step-08-nfrs, step-09-constraints, step-10-assumptions, step-11-dependencies]
inputDocuments:
  - analysis/brainstorming-session-2026-02-15.md
  - taoanh.nexme.vn/app/README_MVP.md
  - taoanh.nexme.vn/app/BUILD_SUMMARY.md
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 2
fieldType: brownfield
classification:
  projectType: web_app
  domain: fitness_wellness
  complexity: low
  projectContext: brownfield
generated: '2026-02-16'
---

# Product Requirements Document - taoanh.nexme.vn

**Author:** Công Đậu
**Date:** 2026-02-16
**Version:** 1.0
**Status:** Production (Deployed)

---

## Executive Summary

**taoanh.nexme.vn** là công cụ tạo ảnh thi đấu Marathon trực tuyến cho phép người dùng:

1. Đăng nhập bằng Google OAuth
2. Quản lý thông tin đội và theo dõi cân nặng của người chơi (Day 0 - Day 10)
3. Tự động tạo ảnh cá nhân và ảnh bảng xếp hạng đội
4. Tải ảnh về máy để chia sẻ

Đây là brownfield project - code đã hoàn chỉnh, được deploy trên Cloudflare Workers với custom domain `taoanh.nexme.vn`. Product sử dụng Next.js 16, Supabase (Auth + Database + Storage), và tích hợp với render API `https://render.nexme.vn/render`.

---

## 1. Product Vision

### 1.1 Vision Statement

Cung cấp công cụ đơn giản, nhanh chóng để các đội Marathon tạo ảnh tuyên đường đẹp mắt, giúp khích lệ tinh thần đồng đội và tạo sự hứng thú trong các cuộc thi đấu Marathon.

### 1.2 Product Goals

| Goal | Description | Priority |
|------|-------------|----------|
| Simple Data Entry | Nhập liệu cân nặng dễ dàng cho tối đa 9 người chơi | P0 |
| Auto-save | Tự động lưu dữ liệu để không mất thông tin | P0 |
| Beautiful Images | Tạo ảnh chất lượng cao từ template có sẵn | P0 |
| Multi-team Support | Hỗ trợ nhiều đội cho cùng một user | P1 |
| Admin Approval | Admin duyệt user trước khi cho phép truy cập | P0 |

### 1.3 Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| DAU (Daily Active Users) | 50+ | TBD |
| Images Generated/Day | 100+ | TBD |
| User Approval Rate | 95%+ | High |
| Page Load Time | < 2s | ~1s |
| Mobile Usability | 100% functional | Yes |

---

## 2. Target Users & Personas

### 2.1 Primary Persona: Marathon Team Captain

**Name:** Nguyễn Văn A
**Role:** Đội trưởng Marathon
**Age:** 28-40
**Location:** Việt Nam

**Goals:**
- Theo dõi cân nặng của cả đội
- Tạo ảnh đẹp để chia sẻ lên mạng xã hội
- Khích lệ tinh thần đồng đội

**Pain Points:**
- Tạo ảnh thủ công tốn thời gian
- Khó theo dõi nhiều người cùng lúc
- Cần ảnh đẹp nhưng không rành thiết kế

**Behaviors:**
- Sử dụng smartphone hàng ngày
- Chia sẻ lên Facebook/Zalo
- Quan tâm đến sức khỏe và fitness

### 2.2 Secondary Persona: Marathon Participant

**Name:** Trần Thị B
**Role:** Người chơi Marathon
**Age:** 25-35

**Goals:**
- Xem tiến trình giảm cân của mình
- So sánh với người khác trong đội
- Chia sẻ thành tích cá nhân

**Pain Points:**
- Không biết thiết kế ảnh
- Muốn ảnh đẹp nhưng nhanh

---

## 3. User Stories

### Epic 1: Authentication & User Approval

| ID | Story | Priority |
|----|-------|----------|
| US-1.1 | Là user, tôi muốn đăng nhập bằng Google OAuth để không cần nhớ password | P0 |
| US-1.2 | Là admin (dqcong@gmail.com), tôi muốn auto-approved để truy cập ngay | P0 |
| US-1.3 | Là user mới, tôi muốn chờ admin duyệt trước khi truy cập dashboard | P0 |
| US-1.4 | Là admin, tôi muốn xem danh sách user chờ duyệt tại /admin | P0 |
| US-1.5 | Là admin, tôi muốn có thể approve/reject user | P0 |
| US-1.6 | Là user bị reject, tôi muốn thông báo rõ ràng | P0 |

### Epic 2: Team & Dataset Management

| ID | Story | Priority |
|----|-------|----------|
| US-2.1 | Là user, tôi muốn tạo nhiều đội để quản lý từng vòng marathon riêng | P1 |
| US-2.2 | Là user, tôi muốn nhập tên đội, tên vòng, số vòng, thời gian | P0 |
| US-2.3 | Là user, tôi muốn dữ liệu tự động lưu khi tôi rời khỏi input | P0 |
| US-2.4 | Là user, tôi muốn xóa toàn bộ dữ liệu để bắt đầu vòng mới | P0 |

### Epic 3: Player Management

| ID | Story | Priority |
|----|-------|----------|
| US-3.1 | Là user, tôi muốn thêm tối đa 9 người chơi (1 đội trưởng + 8 thành viên) | P0 |
| US-3.2 | Là user, tôi muốn chọn vai trò đội trưởng hoặc thành viên | P0 |
| US-3.3 | Là user, tôi muốn upload avatar cho mỗi người chơi | P1 |
| US-3.4 | Là user, tôi muốn nhập cân nặng từ Day 0 đến Day 10 | P0 |
| US-3.5 | Là user, tôi muốn xóa người chơi khỏi đội | P0 |

### Epic 4: Image Generation

| ID | Story | Priority |
|----|-------|----------|
| US-4.1 | Là user, tôi muốn tạo ảnh cá nhân cho người được chọn | P0 |
| US-4.2 | Là user, tôi muốn tạo ảnh bảng xếp hạng toàn đội | P0 |
| US-4.3 | Là user, tôi muốn chọn ngày kết thúc (Day 0-10) để tính toán | P0 |
| US-4.4 | Là user, tôi muốn preview ảnh trước khi download | P0 |
| US-4.5 | Là user, tôi muốn download ảnh về máy | P0 |

---

## 4. Functional Requirements (FRs)

### FR1: Authentication

| ID | Description | Acceptance Criteria |
|----|-------------|---------------------|
| FR-1.1 | Google OAuth login | User có thể đăng nhập bằng Google, redirect đến /dashboard |
| FR-1.2 | User approval workflow | User mới = pending status, cần admin approve |
| FR-1.3 | Admin bypass | dqcong@gmail.com auto-approved |
| FR-1.4 | Sign out | User có thể đăng xuất, redirect về trang login |

### FR2: Team & Dataset Management

| ID | Description | Acceptance Criteria |
|----|-------------|---------------------|
| FR-2.1 | Create dataset | User có thể tạo mới dataset với team_name, round_name, round_number, time_range |
| FR-2.2 | List datasets | User xem danh sách tất cả datasets của mình |
| FR-2.3 | Switch dataset | User có thể chuyển giữa các datasets |
| FR-2.4 | Auto-save dataset | Dữ liệu tự động lưu khi blur input |
| FR-2.5 | Delete dataset | User có thể xóa toàn bộ dữ liệu với confirmation |
| FR-2.6 | Max 9 players | Mỗi dataset tối đa 9 người (1 captain + 8 players) |

### FR3: Player Management

| ID | Description | Acceptance Criteria |
|----|-------------|---------------------|
| FR-3.1 | Add player | User thêm người chơi với tên, vai trò, avatar |
| FR-3.2 | Update player | Sửa thông tin người chơi, auto-save |
| FR-3.3 | Delete player | Xóa người chơi khỏi dataset |
| FR-3.4 | Weight tracking | 11 input cân nặng (Day 0 - Day 10) |
| FR-3.5 | Avatar upload | Upload ảnh lên Supabase Storage |

### FR4: Image Generation

| ID | Description | Acceptance Criteria |
|----|-------------|---------------------|
| FR-4.1 | Personal image | Tạo ảnh 1080x1444 cho từng người được chọn |
| FR-4.2 | Team leaderboard | Tạo ảnh 1080x1920 với bảng xếp hạng |
| FR-4.3 | Day selection | Chọn ngày kết thúc để tính toán tiến trình |
| FR-4.4 | Avatar integration | Avatar hiển thị trong ảnh |
| FR-4.5 | Download | Download ảnh về device |
| FR-4.6 | Multiple images | Hỗ trợ tạo nhiều ảnh cùng lúc |

### FR5: Admin Panel

| ID | Description | Acceptance Criteria |
|----|-------------|---------------------|
| FR-5.1 | Approval queue | Admin xem danh sách user pending |
| FR-5.2 | Approve user | Admin approve user → user vào được dashboard |
| FR-5.3 | Reject user | Admin reject user → user thấy thông báo rejected |
| FR-5.4 | View all status | Admin xem pending/approved/rejected |

---

## 5. Non-Functional Requirements (NFRs)

| ID | Category | Requirement | Priority |
|----|----------|-------------|----------|
| NFR-1 | Performance | Page load time < 2s | P0 |
| NFR-2 | Performance | Image generation < 10s | P0 |
| NFR-3 | Security | Row Level Security (RLS) enabled | P0 |
| NFR-4 | Security | API key ẩn ở server-side | P0 |
| NFR-5 | Availability | Deploy trên Cloudflare Workers | P0 |
| NFR-6 | Mobile | Responsive design trên mobile | P0 |
| NFR-7 | Browser | Hỗ trợ Chrome, Safari, Firefox | P0 |
| NFR-8 | Data Persistence | Dữ liệu không bị mất khi refresh | P0 |
| NFR-9 | Accessibility | Vietnamese UI labels | P0 |

---

## 6. Constraints

| ID | Constraint | Impact |
|----|-----------|--------|
| C-1 | Tech Stack | Phải dùng Next.js 16, Supabase, Cloudflare |
| C-2 | Render API | Phụ thuộc vào render.nexme.vn |
| C-3 | Admin hardcoded | Admin email = dqcong@gmail.com |
| C-4 | Max players | 9 người per team (design constraint) |
| C-5 | Day range | Fixed 11 days (Day 0-10) |
| C-6 | Vietnamese only | UI chỉ hỗ trợ tiếng Việt |

---

## 7. Assumptions

| ID | Assumption | Validation |
|----|------------|------------|
| A-1 | Google OAuth hoạt động ổn định | ✅ Deploy thành công |
| A-2 | Supabase RLS bảo vệ data | ✅ Configured |
| A-3 | Render API available | ✅ Integrated |
| A-4 | User có Google account | Giả định đúng |
| A-5 | Mobile users chiếm > 50% | Responsive design |

---

## 8. Dependencies

| ID | Dependency | Type | Status |
|----|------------|------|--------|
| D-1 | Supabase Project | External | ✅ Active |
| D-2 | Google OAuth App | External | ✅ Configured |
| D-3 | Render API (nexme.vn) | External | ✅ Available |
| D-4 | Cloudflare Account | External | ✅ Active |
| D-5 | Domain taoanh.nexme.vn | External | ✅ Configured |
| D-6 | marathon-avatars Storage Bucket | External | ✅ Created |

---

## 9. Technical Architecture

### 9.1 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | TailwindCSS 4 |
| Auth | Supabase Auth (Google OAuth) |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage (marathon-avatars) |
| Hosting | Cloudflare Workers |
| External API | render.nexme.vn |

### 9.2 Database Schema

**marathon_datasets:**
- id, user_id, team_name, round_name, round_number, time_range
- created_at, updated_at

**marathon_players:**
- id, dataset_id, player_name, role, avatar_url
- day0-day10 (weight columns)
- created_at, updated_at

**user_approvals:**
- id, user_id, email, display_name, avatar_url, status
- created_at, updated_at

### 9.3 API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| /api/render | POST | Proxy to render.nexme.vn |
| /api/avatar | GET | Convert avatar URL to data URL |
| /api/download | GET | Download image from URL |

---

## 10. Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Render API down | High | Low | Error handling, user notification |
| Supabase quota exceeded | Medium | Low | Monitor usage, upgrade plan |
| Cloudflare downtime | Medium | Low | CDN fallback |
| User uploads large images | Low | Medium | File size limit |

---

## 11. Future Enhancements (Out of Scope)

- Multiple image templates selection
- Image history/gallery
- Dark mode toggle
- Email notifications
- Team invitations
- Export data to CSV
- Advanced analytics
- Batch image generation progress bar
- Multi-language support
- Chat/Comment feature
- Social sharing integration (Zalo API)

---

## Appendix: Current Status

✅ **Production Live:** https://taoanh.nexme.vn

✅ **Deployed:** Cloudflare Workers

✅ **Completed Features:**
- Google OAuth authentication
- User approval workflow (admin panel)
- Team/dataset management (multi-dataset support)
- Player management (max 9 players)
- Avatar upload to Supabase Storage
- Weight tracking (Day 0-10)
- Personal image generation
- Team leaderboard generation
- Image preview & download
- Clear data functionality
- Mobile responsive design
