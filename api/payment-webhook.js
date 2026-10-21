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
      service: 'LinguaFlash VietQR Webhook Listener',
      timestamp: Date.now()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    
    // Tìm nội dung chuyển khoản từ các trường phổ biến (SePay, PayOS, hoặc chuyển khoản ngân hàng)
    const transferContent = String(body.content || body.description || body.memo || body.orderCode || '');
    const amount = Number(body.transferAmount || body.amount || 0);

    // Bắt mã giao dịch LF + 5 số (Ví dụ: LF58291)
    const match = transferContent.match(/LF\d{5}/i);
    if (!match) {
      return res.status(200).json({
        success: false,
        message: 'Không tìm thấy mã đơn hàng LF trong nội dung chuyển khoản.',
        receivedContent: transferContent
      });
    }

    const orderId = match[0].toUpperCase();

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
