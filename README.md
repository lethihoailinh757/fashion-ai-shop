# FashionAI Shop - Web bán quần áo tích hợp AI + n8n

Đây là project bài tập lớn môn **Hệ hỗ trợ ra quyết định**. Web có:

- Trang bán quần áo thiết kế đẹp, responsive.
- 100 sản phẩm có dữ liệu đầy đủ: giá, giá cũ, size, màu, chất liệu, tồn kho, khuyến mãi, mô tả, bảo quản.
- Trang chi tiết sản phẩm.
- Nút **Hỏi AI về SP này**: AI tư vấn đúng sản phẩm đang xem.
- Câu trả lời AI luôn kèm link sản phẩm.
- Có giỏ hàng.
- Có quy trình thanh toán và giao hàng.
- Không bắt buộc đăng nhập. Nếu khách đã nhập profile, lần sau tự điền thông tin từ localStorage.
- Trang admin xử lý đơn hàng: xác nhận, đang giao, hoàn thành, hủy.
- Có dữ liệu so sánh sản phẩm với đối thủ cạnh tranh.
- Có thể nối webhook n8n để chăm sóc khách hàng.

## Tài khoản admin

Mật khẩu local mặc định:

```txt
admin123
```

Khi deploy lên Render, nên đặt biến môi trường:

```txt
ADMIN_PASSWORD=mat_khau_cua_ban
```

## Chạy local

```bash
npm install
npm start
```

Mở:

```txt
http://localhost:10000
```

## Deploy Render miễn phí

1. Tạo repo GitHub, upload toàn bộ project.
2. Vào Render Dashboard.
3. Chọn **New +** → **Web Service**.
4. Kết nối repo GitHub.
5. Cấu hình:

```txt
Environment: Node
Build Command: npm install
Start Command: npm start
```

6. Thêm Environment Variables:

```txt
ADMIN_PASSWORD=mat_khau_admin
PUBLIC_URL=https://ten-web-cua-ban.onrender.com
N8N_WEBHOOK_URL=https://link-webhook-n8n-cua-ban
```

Nếu chưa có n8n thì bỏ trống `N8N_WEBHOOK_URL`, web vẫn có AI fallback demo.

## Gợi ý workflow n8n

Webhook node:

- Method: POST
- Path: fashion-ai-advisor

Sau đó nối tới AI Agent hoặc OpenAI node. Prompt gợi ý:

```txt
Bạn là AI tư vấn bán quần áo cho FashionAI Shop.
Dữ liệu khách hàng: {{$json.profile}}
Sản phẩm đang hỏi: {{$json.product}}
Link sản phẩm: {{$json.productUrl}}
Câu hỏi khách hàng: {{$json.question}}

Hãy trả lời tiếng Việt, thân thiện, ngắn gọn nhưng đủ ý.
Tư vấn đúng sản phẩm, gồm: size, chất liệu, phối đồ, ưu đãi, cách mua online.
Luôn thêm link sản phẩm ở cuối.
```

Respond to Webhook trả về JSON:

```json
{
  "answer": "Nội dung tư vấn của AI..."
}
```

## Cấu trúc project

```txt
server.js              Backend Express + API sản phẩm/đơn hàng/AI
public/index.html      Trang chủ bán hàng
public/product.html    Trang chi tiết sản phẩm
public/checkout.html   Thanh toán
public/admin.html      Admin xử lý đơn
public/app.js          Logic frontend khách hàng
public/admin.js        Logic admin
data/products.json     100 sản phẩm
data/orders.json       Lưu đơn hàng demo
```

## Lưu ý khi nộp bài

Bản này dùng file JSON để demo nhanh trong 7 ngày. Khi làm bản nâng cao hơn có thể chuyển `orders.json` sang MongoDB Atlas hoặc PostgreSQL để lưu đơn bền vững hơn.
