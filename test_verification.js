/**
 * PondyCollect End-to-End System Verification Test Script
 */

const http = require('http');

const BASE_URL = 'http://127.0.0.1:3000';

function makeRequest(path, method = 'GET', body = null, cookie = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const headers = {
            'Accept': 'application/json, text/html'
        };

        if (body) {
            headers['Content-Type'] = 'application/json';
        }
        if (cookie) {
            headers['Cookie'] = cookie;
        }

        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: headers
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(data);
                } catch (e) {
                    parsed = data;
                }
                const setCookie = res.headers['set-cookie'];
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: parsed,
                    setCookie: setCookie ? setCookie[0].split(';')[0] : null
                });
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    console.log('\n======================================================');
    console.log('🧪 Starting PondyCollect Verification Test Suite');
    console.log('======================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(testName, condition, details = '') {
        if (condition) {
            console.log(`  ✅ PASS: ${testName}`);
            passed++;
        } else {
            console.error(`  ❌ FAIL: ${testName} - ${details}`);
            failed++;
        }
    }

    try {
        // Test 1: Public Pages
        const homeRes = await makeRequest('/');
        assert('Home page responds with HTTP 200', homeRes.status === 200);

        // Test 2: Unauthenticated Protected Dashboard HTML Guard
        const unauthEmpPage = await makeRequest('/employee-dashboard.html');
        assert('Unauthenticated access to /employee-dashboard.html redirects (302)', unauthEmpPage.status === 302);
        assert('Redirects to login with unauthorized error', unauthEmpPage.headers.location === '/login.html?error=unauthorized');

        // Test 3: Unauthenticated Protected API Access
        const unauthApi = await makeRequest('/api/dashboard/employee');
        assert('Unauthenticated API access returns HTTP 401', unauthApi.status === 401);
        assert('Error message instructs sign-in', unauthApi.body.message && unauthApi.body.message.includes('Unauthorized'));

        // Test 4: Register a new Test Employee
        const testEmail = `test.employee.${Date.now()}@pondycollect.com`;
        const regRes = await makeRequest('/api/auth/register', 'POST', {
            name: 'Verification Bot',
            email: testEmail,
            password: 'Password@123',
            confirmPassword: 'Password@123',
            role: 'employee',
            department: 'Quality Assurance',
            designation: 'Automation Engineer',
            phone: '+91 99887 76655'
        });
        assert('Employee registration succeeds with HTTP 201', regRes.status === 201);
        assert('Registration response returns success true', regRes.body.success === true);

        // Test 5: Duplicate Email Registration Prevention
        const dupRes = await makeRequest('/api/auth/register', 'POST', {
            name: 'Verification Bot',
            email: testEmail,
            password: 'Password@123',
            confirmPassword: 'Password@123',
            role: 'employee',
            department: 'Quality Assurance',
            designation: 'Automation Engineer',
            phone: '+91 99887 76655'
        });
        assert('Duplicate email registration returns HTTP 409 Conflict', dupRes.status === 409);

        // Test 6: Invalid Credentials Login
        const badLogin = await makeRequest('/api/auth/login', 'POST', {
            email: 'nonexistent@pondycollect.com',
            password: 'WrongPassword'
        });
        assert('Invalid credentials returns HTTP 401', badLogin.status === 401);

        // Test 7: Employee Login with Seed Data
        const empLogin = await makeRequest('/api/auth/login', 'POST', {
            email: 'john.doe@pondycollect.com',
            password: 'Password@123'
        });
        assert('Employee login succeeds with HTTP 200', empLogin.status === 200);
        assert('Returns redirectUrl to employee-dashboard.html', empLogin.body.redirectUrl === '/employee-dashboard.html');
        assert('Session cookie received', !!empLogin.setCookie);
        const empCookie = empLogin.setCookie;

        // Test 8: Employee Dashboard Data Fetching (Profile + Admin records)
        const empDash = await makeRequest('/api/dashboard/employee', 'GET', null, empCookie);
        assert('Employee dashboard API responds with HTTP 200', empDash.status === 200);
        assert('Employee profile has correct name', empDash.body.profile && empDash.body.profile.name === 'John Doe');
        assert('Employee can view registered administrators', Array.isArray(empDash.body.administrators) && empDash.body.administrators.length >= 2);

        // Test 9: Employee Forbidden from Admin API (RBAC Enforcement)
        const empForbidden = await makeRequest('/api/dashboard/admin', 'GET', null, empCookie);
        assert('Employee forbidden from Admin API with HTTP 403', empForbidden.status === 403);

        // Test 10: Admin Login with Seed Data
        const adminLogin = await makeRequest('/api/auth/login', 'POST', {
            email: 'alex.admin@pondycollect.com',
            password: 'Password@123'
        });
        assert('Admin login succeeds with HTTP 200', adminLogin.status === 200);
        assert('Returns redirectUrl to admin-dashboard.html', adminLogin.body.redirectUrl === '/admin-dashboard.html');
        const adminCookie = adminLogin.setCookie;

        // Test 11: Admin Dashboard Data Fetching (Profile + Employee records)
        const adminDash = await makeRequest('/api/dashboard/admin', 'GET', null, adminCookie);
        assert('Admin dashboard API responds with HTTP 200', adminDash.status === 200);
        assert('Admin profile has correct name', adminDash.body.profile && adminDash.body.profile.name === 'Alex Mercer');
        assert('Admin can view registered employees', Array.isArray(adminDash.body.employees) && adminDash.body.employees.length >= 2);

        // Test 12: Admin Stats API (Computed from DB)
        const adminStats = await makeRequest('/api/dashboard/admin/stats', 'GET', null, adminCookie);
        assert('Admin stats API responds with HTTP 200', adminStats.status === 200);
        assert('Total employees is a positive number', adminStats.body.stats && adminStats.body.stats.totalEmployees >= 3);
        console.log(`     -> Live dynamic totalEmployees count from MySQL: ${adminStats.body.stats.totalEmployees}`);

        // Test 13: Admin Forbidden from Employee API (RBAC Enforcement)
        const adminForbidden = await makeRequest('/api/dashboard/employee', 'GET', null, adminCookie);
        assert('Admin forbidden from Employee API with HTTP 403', adminForbidden.status === 403);

        // Test 14: Logout
        const logoutRes = await makeRequest('/api/auth/logout', 'POST', null, empCookie);
        assert('Logout succeeds with HTTP 200', logoutRes.status === 200);

    } catch (error) {
        console.error('Fatal test execution error:', error);
        failed++;
    }

    console.log('\n======================================================');
    console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');

    process.exit(failed > 0 ? 1 : 0);
}

runTests();
