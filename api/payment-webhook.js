/**
 * api/payment-webhook.js - Vercel Serverless Webhook Endpoint nhận biến động số dư VietQR (SePay / PayOS / Ngân hàng)
 */

export default async function handler(req, res) {
  // Cho phép CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health check endpoint
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'active',
      service: 'HaiSonFlash VietQR Webhook Listener',
      timestamp: Date.now()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {}
    }

    // Tìm mã giao dịch LF + 5 số trên TOÀN BỘ chuỗi payload (chống trượt bất kỳ định dạng nào từ SePay)
    const rawContent = (typeof body === 'object' ? JSON.stringify(body) : String(body)) + ' ' + (req.url || '');
    const match = rawContent.match(/LF\d{5}/i);
    
    if (!match) {
      return res.status(200).json({
        success: false,
        message: 'Không tìm thấy mã đơn hàng LF trong nội dung webhook.',
        receivedBody: body
      });
    }

    const orderId = match[0].toUpperCase();

    // Tìm số tiền từ các trường phổ biến của SePay / Casso / PayOS
    const amount = Number(
      body.transferAmount || 
      body.amount || 
      body.amount_in || 
      body.total || 
      20000
    );

    // Kiểm tra số tiền tối thiểu (20.000 VNĐ)
    if (amount > 0 && amount < 20000) {
      return res.status(200).json({
        success: false,
        message: `Số tiền chuyển (${amount}đ) chưa đủ mức phí kích hoạt 20.000đ.`,
        orderId
      });
    }

    // Cập nhật trạng thái đơn hàng trên Cloud Firestore qua REST API
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/haisonflashcard/databases/(default)/documents/payment_orders/${orderId}?updateMask.fieldPaths=status&updateMask.fieldPaths=paidAt`;
    
    const patchPayload = {
      fields: {
        status: { stringValue: 'PAID' },
        paidAt: { integerValue: String(Date.now()) }
      }
    };

    const firestoreResp = await fetch(firestoreUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patchPayload)
    });

    if (!firestoreResp.ok) {
      const errText = await firestoreResp.text();
      console.error('Lỗi cập nhật Firestore:', errText);
      return res.status(500).json({
        success: false,
        error: 'Lỗi cập nhật Firestore',
        details: errText
      });
    }

    return res.status(200).json({
      success: true,
      message: `Đơn hàng ${orderId} đã được xác nhận thanh toán thành công!`,
      orderId,
      amount
    });

  } catch (error) {
    console.error('Lỗi xử lý webhook:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
