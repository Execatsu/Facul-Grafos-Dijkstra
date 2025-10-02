import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import GraphVisualizer from '../components/GraphVisualizer';

export const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<GraphVisualizer />}/>

            {/* Rota para redirecionamento */}
            <Route path="*" element={<Navigate to="/" replace />}/>
        </Routes>
    );
};

export default AppRoutes;