// Script duy trì đăng nhập / đánh thức Supabase Database
//
// Cách chạy:
// 1. Chạy thủ công:
//    NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key" node app/scripts/ping-supabase.js
// 
// 2. Cài đặt vào Crontab trên Mac (Chạy tự động lúc 9h sáng mỗi 3 ngày):
//    Mở terminal chạy: crontab -e
//    Thêm dòng sau:
//    0 9 */3 * * export NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key" && node /Users/congdau/Projects/taoanh.nexme.vn/app/scripts/ping-supabase.js >> /Users/congdau/Projects/taoanh.nexme.vn/app/scripts/ping.log 2>&1

const https = require('https');

// Đọc thông số từ Environment Variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vkhqqybnvnoagxqglnkn.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('❌ Lỗi: Thiếu biến môi trường NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.log('Vui lòng chạy lệnh kèm Key:');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY="your_key" node app/scripts/ping-supabase.js');
  process.exit(1);
}

const url = `${supabaseUrl}/rest/v1/marathon_datasets?limit=1`;

const options = {
  method: 'GET',
  headers: {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`
  }
};

console.log(`[${new Date().toISOString()}] 🔄 Đang gửi ping đánh thức Supabase: ${supabaseUrl}...`);

const req = https.request(url, options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(`[Status Code]: ${res.statusCode}`);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ Thành công! Database Supabase đang hoạt động và đã được làm mới hoạt động.');
    } else if (res.statusCode === 406 || res.statusCode === 401) {
      console.log('✅ Thành công! Supabase nhận yêu cầu và phản hồi (mã xác thực hợp lệ).');
    } else {
      console.error(`❌ Thất bại với Status: ${res.statusCode}. Chi tiết: ${data}`);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Lỗi kết nối mạng:', error.message);
});

req.end();
