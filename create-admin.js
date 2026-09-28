require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const User = require('./src/models/User');

function ask(question) {
    const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => terminal.question(question, answer => {
        terminal.close();
        resolve(answer.trim());
    }));
}

function askSecret(question) {
    return new Promise((resolve, reject) => {
        if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
            reject(new Error('Run this command in an interactive terminal so the password can be entered privately.'));
            return;
        }

        const stdin = process.stdin;
        let value = '';
        process.stdout.write(question);
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf8');

        const finish = (error) => {
            stdin.removeListener('data', onData);
            stdin.setRawMode(false);
            stdin.pause();
            process.stdout.write('\n');
            if (error) reject(error);
            else resolve(value);
        };

        const onData = (key) => {
            if (key === '\u0003') return finish(new Error('Cancelled.'));
            if (key === '\r' || key === '\n') return finish();
            if (key === '\u007f' || key === '\b') {
                if (value.length) {
                    value = value.slice(0, -1);
                    process.stdout.write('\b \b');
                }
                return;
            }
            if (key >= ' ' && key !== '\u007f') {
                value += key;
                process.stdout.write('*');
            }
        };

        stdin.on('data', onData);
    });
}

async function createAdmin() {
    if (!process.env.MONGODB_URI || !/^mongodb(?:\+srv)?:\/\//i.test(process.env.MONGODB_URI)) {
        throw new Error('MONGODB_URI is missing or malformed. Set a valid MongoDB URI in the project-root .env first.');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to the configured database.');

    const email = (await ask('Admin account email: ')).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Enter a valid email address.');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        if (existingUser.role === 'admin') {
            console.log('This account already has administrator access. Its password was not changed.');
            return;
        }
        const confirmation = await ask(`Promote the existing account ${email} to administrator? Type PROMOTE to continue: `);
        if (confirmation !== 'PROMOTE') {
            console.log('No changes made.');
            return;
        }
        existingUser.role = 'admin';
        await existingUser.save();
        console.log('Existing account promoted. Its password was not changed.');
        return;
    }

    const name = await ask('Admin display name: ');
    const password = await askSecret('New website password (minimum 12 characters; input is hidden): ');
    if (password.length < 12) throw new Error('Use a password with at least 12 characters.');
    const confirmation = await askSecret('Confirm password: ');
    if (password !== confirmation) throw new Error('Passwords do not match. No account was created.');

    const passwordHash = await bcrypt.hash(password, 12);
    await User.create({ email, name, passwordHash, role: 'admin' });
    console.log(`Administrator account created for ${email}. The password was not printed.`);
}

createAdmin()
    .catch(error => {
        console.error(`Admin setup failed: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
