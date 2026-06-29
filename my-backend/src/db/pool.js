import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const {Pool} = pg;

export const pool = new Pool ({

    connectionString: process.env.DATABASE_URL,

});

export const query = (text, params) => pool.query(text, params);

export async function withTransaction(fn) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await fn(client);
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}