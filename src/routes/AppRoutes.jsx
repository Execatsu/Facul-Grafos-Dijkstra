import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import GraphVisualizer from '../components/GraphVisualizer';

export const AppRoutes = () => {
    return (
        <Routes>
            {/* Rotas Públicas */}
            {/* <Route path="/" element={<Navigate to="/inicio" replace />}/> */}
            {/* <Route path="/" element={<Dashboard />}/>
            <Route path="/home" element={<Home />} /> */}
            <Route path="*" element={<GraphVisualizer />}/>

            {/* Rota para Not Found ou redirecionamento */}
            {/* <Route path="*" element={<Navigate to="/home" replace />}/> */}
        </Routes>
    );
};

export default AppRoutes;