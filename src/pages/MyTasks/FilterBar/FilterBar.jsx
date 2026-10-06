function FilterBar(){

    return(
    <>
        <div class="filter-bar" style={{marginBottom:0}}>
            <div class="filter-bar-row">
              <div class="input-icon-wrap"><span class="icon icon-sm" data-icon="search"></span><input class="input" placeholder="Search tasks…"/></div>
              <select class="select"><option>Assignee: All</option><option>Cao Sơn</option><option>Quách Loan</option><option>Ngô Lâm</option><option>Khánh Ngọc</option></select>
              <select class="select"><option>Priority: All</option><option>Urgent</option><option>High</option><option>Medium</option><option>Low</option></select>
              <select class="select"><option>Due date</option><option>Overdue</option><option>Due today</option><option>Upcoming</option><option>No due date</option></select>
              <select class="select"><option>Sort: Priority</option><option>Sort: Due date</option><option>Sort: Title</option><option>Sort: Newest</option></select>
            </div>
          </div>
    </>
    )
}
export default FilterBar;