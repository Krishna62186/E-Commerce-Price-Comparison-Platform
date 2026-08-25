import jwt from 'jsonwebtoken';
import { User } from './models.js';
export const tokenFor = u => jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
export const protect = async (req, res, next) => { try { const token = req.headers.authorization?.split(' ')[1]; if (!token) throw new Error(); req.user = await User.findById(jwt.verify(token, process.env.JWT_SECRET || 'dev_secret').id); if (!req.user) throw new Error(); next(); } catch { res.status(401).json({ message: 'Authentication required' }); } };
export const adminOnly = (req, res, next) => req.user?.role === 'admin' ? next() : res.status(403).json({ message: 'Administrator access required' });
