require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const { Pool } = require("pg");

// Configurar conexión con PostgreSQL
const pool = new Pool({
    user: "tu_usuario",
    host: "localhost",
    database: "joyas",
    password: "amanda",
    port: 5432,
});

// Middleware para logs de rutas
app.use((req, res, next) => {
    console.log(`Consulta a la ruta: ${req.url}`);
    next();
});

// Ruta GET /joyas con HATEOAS, paginación y ordenamiento
app.get("/joyas", async (req, res) => {
    try {
        let { limits = 10, page = 1, order_by = "id_ASC" } = req.query;
        let [campo, orden] = order_by.split("_");

        // Validar orden ASC o DESC
        orden = orden.toUpperCase() === "DESC" ? "DESC" : "ASC";

        // Calcular el offset para paginación
        let offset = (page - 1) * limits;

        // Consultar datos con ordenamiento y paginación
        const result = await pool.query(
            `SELECT * FROM inventario ORDER BY ${campo} ${orden} LIMIT $1 OFFSET $2`,
            [limits, offset]
        );

        // Construcción de HATEOAS
        const joyas = result.rows.map((j) => ({
            ...j,
            links: {
                self: `/joyas/${j.id}`,
                categoria: `/joyas/filtros?categoria=${j.categoria}`,
                metal: `/joyas/filtros?metal=${j.metal}`,
            },
        }));

        res.json(joyas);
    } catch (error) {
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// Ruta GET /joyas/filtros
app.get("/joyas/filtros", async (req, res) => {
    try {
        let { precio_min = 0, precio_max = 999999, categoria, metal } = req.query;
        let query = `SELECT * FROM inventario WHERE precio BETWEEN $1 AND $2`;
        let values = [precio_min, precio_max];

        if (categoria) {
            query += ` AND categoria = $${values.length + 1}`;
            values.push(categoria);
        }
        if (metal) {
            query += ` AND metal = $${values.length + 1}`;
            values.push(metal);
        }

        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: "Error en la consulta" });
    }
});

// Iniciar servidor
app.listen(port, "0.0.0.0", () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});

