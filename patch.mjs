import fs from 'fs';

const file = 'src/features/admin/AdminDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const search = `			try {
				for (const nameId of selectedNames) {
					const name = nameById.get(nameId);
					if (!name) {
						continue;
					}
					await actionHandlers[action](name);
				}
				await loadAdminData();`;

const replace = `			try {
				const promises = Array.from(selectedNames)
					.map((nameId) => nameById.get(nameId))
					.filter((name): name is NameWithStats => name !== undefined)
					.map((name) => actionHandlers[action](name));

				await Promise.all(promises);
				await loadAdminData();`;

content = content.replace(search, replace);
fs.writeFileSync(file, content);
console.log("Patched AdminDashboard.tsx");
