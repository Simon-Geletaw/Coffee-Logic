process.on('message', (m) => { console.log('child got', m); process.exit(0); }); setTimeout(() => {}, 2000);
