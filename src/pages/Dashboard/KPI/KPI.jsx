import React, { useState, useEffect } from 'react';

function KPI() {
    // 1. Khởi tạo State lưu đúng cấu trúc Object mà API trả về
    const [portfolioData, setPortfolioData] = useState({
        totalProjects: 0,
        totalBudget: 0,
        onTimeRate: 0
    });
    const [loading, setLoading] = useState(true);

    // 2. Fetch dữ liệu từ API Portfolio
    useEffect(() => {
        const token = localStorage.getItem('token'); 

        fetch('http://localhost:3000/api/project/portfolio', { 
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
        .then(res => {
            if (!res.ok) throw new Error("Không thể tải dữ liệu Portfolio");
            return res.json();
        })
        .then(data => {
            // Đổ trực tiếp Object thống kê vào State
            if (data) {
                setPortfolioData(data);
            }
            setLoading(false);
        })
        .catch(err => {
            console.error("Lỗi khi đồng bộ dữ liệu KPI:", err);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return <div className="text-xs text-slate-400 p-4">Đang tải số liệu hệ thống...</div>;
    }

    return (
        <>
        {/* Đổi cấu trúc layout class phù hợp với dữ liệu 3 cột */}
        <div className="grid-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            
            {/* Card 1: Total Projects */}
            <div className="card stat-card">
              <span className="stat-card-icon tone-primary">
                <span className="icon" data-icon="listTodo">
                  <svg viewBox="0 0 24 24"><path d="M13 5h8"></path><path d="M13 12h8"></path><path d="M13 19h8"></path><path d="m3 17 2 2 4-4"></path><rect x="3" y="4" width="6" height="6" rx="1"></rect></svg>
                </span>
              </span>
              <div>
                <p className="stat-card-label">Total Projects</p>
                <p className="stat-card-value">{portfolioData.totalProjects}</p>
              </div>
            </div>

            {/* Card 2: On-Time Rate */}
            <div className="card stat-card">
              <span className="stat-card-icon tone-success">
                <span className="icon" data-icon="checkCircle2">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="m16 9-5.5 5.5L8 12"></path></svg>
                </span>
              </span>
              <div>
                <p className="stat-card-label">On-Time Rate</p>
                <p className="stat-card-value">{portfolioData.onTimeRate}%</p>
              </div>
            </div>

            {/* Card 3: Total Budget */}
            <div className="card stat-card">
              <span className="stat-card-icon tone-warning">
                <span className="icon" data-icon="loader">
                  <svg viewBox="0 0 24 24"><path d="M12 2v4"></path><path d="m16.2 7.8 2.9-2.9"></path><path d="M18 12h4"></path><path d="m16.2 16.2 2.9 2.9"></path><path d="M12 18v4"></path><path d="m4.9 19.1 2.9-2.9"></path><path d="M2 12h4"></path><path d="m4.9 4.9 2.9 2.9"></path></svg>
                </span>
              </span>
              <div>
                <p className="stat-card-label">Total Budget</p>
                <p className="stat-card-value">${portfolioData.totalBudget.toLocaleString('en-US')}</p>
              </div>
            </div>

        </div>
        </>
    );
}

export default KPI;
