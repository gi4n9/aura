"use client";

export default function NotFound() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: '#F9F8F4'
        }}>
            <h1 style={{ fontSize: '6rem', color: '#C5A059', opacity: 0.5 }}>404</h1>
            <h2 style={{ fontSize: '1.5rem', color: '#1a1a1a' }}>Không tìm thấy trang</h2>
            <p style={{ color: '#666', marginTop: '0.5rem' }}>
                Trang bạn đang tìm kiếm không tồn tại.
            </p>
            <a
                href="/"
                style={{
                    marginTop: '2rem',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#1a1a1a',
                    color: 'white',
                    borderRadius: '0.5rem',
                    textDecoration: 'none'
                }}
            >
                Trở về trang chủ
            </a>
        </div>
    );
}