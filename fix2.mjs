import fs from 'fs';

const adminFile = 'src/features/admin/AdminDashboard.tsx';
let adminContent = fs.readFileSync(adminFile, 'utf8');
adminContent = adminContent.replace(/type="button"\n\s+onClick=\{\(\) \=\> handleTabChange\(tab.id\)\}\n\s+type="button"/g, 'type="button"\n\t\t\t\t\t\tonClick={() => handleTabChange(tab.id)}');
fs.writeFileSync(adminFile, adminContent);
