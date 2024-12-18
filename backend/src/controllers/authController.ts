import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { TypedRequest, TypedResponse, User } from '../types/types.js';
import { Request, Response, NextFunction } from 'express';
import { RequestHandler } from 'express-serve-static-core';

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        
        console.log('Intento de login:', { email, password: '****' });
        
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            console.log('Usuario no encontrado');
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            console.log('Contraseña incorrecta');
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, rol: user.rol },
            process.env.JWT_SECRET || 'saul quique lilia',
            { expiresIn: '24h' }
        );

        console.log('Login exitoso para:', email);
        
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                nombre: user.nombre,
                rol: user.rol
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

export const register: RequestHandler = async (req, res, next) => {
    try {
        const { email, password, nombre, username } = req.body;

        // Verificar si el usuario ya existe
        const existingUser = await pool.query(
            'SELECT * FROM usuarios WHERE email = $1 OR username = $2',
            [email, username]
        );

        if (existingUser.rows.length > 0) {
            res.status(400).json({
                message: 'El email o nombre de usuario ya está registrado'
            });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            `INSERT INTO usuarios (id, email, password, nombre, username, rol, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, 'usuario', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             RETURNING id, email, nombre, username, rol`,
            [email, hashedPassword, nombre, username]
        );

        const user = result.rows[0];
        const token = jwt.sign(
            { id: user.id, email: user.email, rol: user.rol },
            process.env.JWT_SECRET || 'saul quique lilia',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            token,
            user: {
                id: user.id,
                email: user.email,
                nombre: user.nombre,
                username: user.username,
                rol: user.rol
            }
        });
    } catch (error) {
        next(error);
    }
};

export const adminLogin = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    console.log('Intento de login admin:', { email, password: '****' });

    if (email === 'admin@admin.com' && password === 'admin123') {
        console.log('Credenciales admin correctas, generando token...');
        const token = jwt.sign(
            { id: 'admin', email: 'admin@admin.com', rol: 'admin' },
            process.env.JWT_SECRET || 'saul quique lilia',
            { expiresIn: '24h' }
        );

        const response = {
            token,
            user: {
                id: 'admin',
                email: 'admin@admin.com',
                nombre: 'Administrador',
                rol: 'admin'
            }
        };

        console.log('Enviando respuesta:', response);
        res.json(response);
        return;
    }

    res.status(401).json({ message: 'Credenciales inválidas' });
}; 