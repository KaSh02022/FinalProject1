function FilterBar(){

    return(
    <>
        <div className="filter-bar" style={{marginBottom:0}}>
            <div className="filter-bar-row">
              <div className="input-icon-wrap"><span className="icon icon-sm" data-icon="search"></span><input className="input" placeholder="Search tasks…"/></div>
              <select className="select"><option>Assignee: All</option><option>Cao Sơn</option><option>Quách Loan</option><option>Ngô Lâm</option><option>Khánh Ngọc</option></select>
              <select className="select"><option>Priority: All</option><option>Urgent</option><option>High</option><option>Medium</option><option>Low</option></select>
              <select className="select"><option>Due date</option><option>Overdue</option><option>Due today</option><option>Upcoming</option><option>No due date</option></select>
              <select className="select"><option>Sort: Priority</option><option>Sort: Due date</option><option>Sort: Title</option><option>Sort: Newest</option></select>
            </div>
          </div>
    </>
    )
}
export default FilterBar;