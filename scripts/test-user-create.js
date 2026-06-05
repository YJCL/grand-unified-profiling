
async function testUserCreate() {
    console.log('Testing user creation (POST /api/user)...');
    try {
        const res = await fetch('http://localhost:3000/api/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}'
        });

        console.log('Status:', res.status);
        const text = await res.text();

        try {
            const json = JSON.parse(text);
            console.log('Success. User ID:', json.id);
        } catch (e) {
            console.error('Failed to parse JSON.');
            console.log('Raw response:', text.substring(0, 500));
        }
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

testUserCreate();
