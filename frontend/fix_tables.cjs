const fs = require('fs');
const files = [
  'src/pages/WorkingSchedules.jsx',
  'src/components/attendance/RegularizationTable.jsx',
  'src/components/attendance/AttendanceTable.jsx',
  'src/components/timeOff/AllocationTable.jsx',
  'src/components/timeOff/LeaveTypeTable.jsx',
  'src/components/timeOff/LeaveRequestTable.jsx',
  'src/components/contracts/ContractTable.jsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (file === 'src/pages/WorkingSchedules.jsx') {
    content = content.replace('import { Table } from \'../components/ui/Table\';', 'import { DataTable } from \'../components/ui/DataTable\';');
  } else {
    content = content.replace('import { Table } from "../ui/Table";', 'import { DataTable } from "../ui/DataTable";');
  }
  
  content = content.replace(/<Table/g, '<DataTable');
  content = content.replace(/<\/Table>/g, '</DataTable>');
  
  fs.writeFileSync(file, content);
  console.log('Fixed ' + file);
}
