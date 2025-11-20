import { pool } from './database.js';

export default function NeonAdapter() {
  return {
    async createVerificationToken(verificationToken) {
      const { identifier, expires, token } = verificationToken;
      const query = `
        INSERT INTO auth_verification_token ( identifier, expires, token )
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      const result = await pool().query(query, [identifier, expires, token]);
      return result.rows[0];
    },
    async useVerificationToken({ identifier, token }) {
      const query = `DELETE FROM auth_verification_token
        WHERE identifier = $1 AND token = $2
        RETURNING identifier, expires, token`;
      const result = await pool().query(query, [identifier, token]);
      return result.rowCount !== 0 ? result.rows[0] : null;
    },

    async createUser(user) {
      const { name, email, emailVerified, image } = user;
      const query = `
        INSERT INTO auth_users (name, email, "emailVerified", image)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, email, "emailVerified", image`;
      const result = await pool().query(query, [
        name,
        email,
        emailVerified,
        image,
      ]);
      return result.rows[0];
    },
    async getUser(id) {
      const query = 'SELECT * FROM auth_users WHERE id = $1';
      try {
        const result = await pool().query(query, [id]);
        return result.rowCount === 0 ? null : result.rows[0];
      } catch {
        return null;
      }
    },
    async getUserByEmail(email) {
      const query = 'SELECT * FROM auth_users WHERE email = $1';
      const result = await pool().query(query, [email]);
      if (result.rowCount === 0) {
        return null;
      }
      const userData = result.rows[0];
      const accountsData = await pool().query(
        'SELECT * FROM auth_accounts WHERE "providerAccountId" = $1',
        [userData.id]
      );
      return {
        ...userData,
        accounts: accountsData.rows,
      };
    },
    async getUserByAccount({ providerAccountId, provider }) {
      const query = `
        SELECT u.* FROM auth_users u 
        JOIN auth_accounts a ON u.id = a."userId"
        WHERE a.provider = $1 AND a."providerAccountId" = $2`;

      const result = await pool().query(query, [provider, providerAccountId]);
      return result.rowCount !== 0 ? result.rows[0] : null;
    },
    async updateUser(user) {
      const fetchQuery = 'SELECT * FROM auth_users WHERE id = $1';
      const query1 = await pool().query(fetchQuery, [user.id]);
      const oldUser = query1.rows[0];

      const newUser = {
        ...oldUser,
        ...user,
      };

      const { id, name, email, emailVerified, image } = newUser;
      const updateQuery = `
        UPDATE auth_users SET
        name = $2, email = $3, "emailVerified" = $4, image = $5
        WHERE id = $1
        RETURNING name, id, email, "emailVerified", image
      `;
      const query2 = await pool().query(updateQuery, [
        id,
        name,
        email,
        emailVerified,
        image,
      ]);
      return query2.rows[0];
    },
    async linkAccount(account) {
      const query = `
        INSERT INTO auth_accounts
        (
          "userId",
          provider,
          type,
          "providerAccountId",
          access_token,
          expires_at,
          refresh_token,
          id_token,
          scope,
          session_state,
          token_type,
          password
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING
          id,
          "userId",
          provider,
          type,
          "providerAccountId",
          access_token,
          expires_at,
          refresh_token,
          id_token,
          scope,
          session_state,
          token_type,
          password
      `;

      const params = [
        account.userId,
        account.provider,
        account.type,
        account.providerAccountId,
        account.access_token,
        account.expires_at,
        account.refresh_token,
        account.id_token,
        account.scope,
        account.session_state,
        account.token_type,
        account.extraData?.password,
      ];

      const result = await pool().query(query, params);
      return result.rows[0];
    },
    async createSession({ sessionToken, userId, expires }) {
      if (userId === undefined) {
        throw Error('userId is undefined in createSession');
      }
      const query = `INSERT INTO auth_sessions ("userId", expires, "sessionToken")
        VALUES ($1, $2, $3)
        RETURNING id, "sessionToken", "userId", expires`;

      const result = await pool().query(query, [userId, expires, sessionToken]);
      return result.rows[0];
    },

    async getSessionAndUser(sessionToken) {
      if (sessionToken === undefined) {
        return null;
      }
      const result1 = await pool().query(
        `SELECT * FROM auth_sessions WHERE "sessionToken" = $1`,
        [sessionToken]
      );
      if (result1.rowCount === 0) {
        return null;
      }
      const session = result1.rows[0];

      const result2 = await pool().query(
        'SELECT * FROM auth_users WHERE id = $1',
        [session.userId]
      );
      if (result2.rowCount === 0) {
        return null;
      }
      const user = result2.rows[0];
      return {
        session,
        user,
      };
    },
    async updateSession(session) {
      const { sessionToken } = session;
      const result1 = await pool().query(
        `SELECT * FROM auth_sessions WHERE "sessionToken" = $1`,
        [sessionToken]
      );
      if (result1.rowCount === 0) {
        return null;
      }
      const originalSession = result1.rows[0];

      const newSession = {
        ...originalSession,
        ...session,
      };
      const query = `
        UPDATE auth_sessions SET
        expires = $2
        WHERE "sessionToken" = $1
        RETURNING *
      `;
      const result = await pool().query(query, [
        newSession.sessionToken,
        newSession.expires,
      ]);
      return result.rows[0];
    },
    async deleteSession(sessionToken) {
      const query = `DELETE FROM auth_sessions WHERE "sessionToken" = $1`;
      await pool().query(query, [sessionToken]);
    },
    async unlinkAccount(partialAccount) {
      const { provider, providerAccountId } = partialAccount;
      const query = `DELETE FROM auth_accounts WHERE "providerAccountId" = $1 AND provider = $2`;
      await pool().query(query, [providerAccountId, provider]);
    },
    async deleteUser(userId) {
      await pool().query('DELETE FROM auth_users WHERE id = $1', [userId]);
      await pool().query('DELETE FROM auth_sessions WHERE "userId" = $1', [
        userId,
      ]);
      await pool().query('DELETE FROM auth_accounts WHERE "userId" = $1', [
        userId,
      ]);
    },
  };
}

