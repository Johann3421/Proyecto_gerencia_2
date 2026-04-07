import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor for auth errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== '/login') {
      // Clear and redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

/* ── Auth ── */
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

/* ── Dashboard ── */
export const dashboardAPI = {
  metrics: () => api.get('/dashboard/metrics'),
  activity: () => api.get('/dashboard/activity'),
};

/* ── Comercial ── */
export const comercialAPI = {
  getVentas: (params) => api.get('/comercial/ventas', { params }),
  createVenta: (data) => api.post('/comercial/ventas', data),
  getVenta: (id) => api.get(`/comercial/ventas/${id}`),
  updateVenta: (id, data) => api.put(`/comercial/ventas/${id}`, data),
  deleteVenta: (id) => api.delete(`/comercial/ventas/${id}`),
  getClientes: (params) => api.get('/comercial/clientes', { params }),
  createCliente: (data) => api.post('/comercial/clientes', data),
};

/* ── Logistica ── */
export const logisticaAPI = {
  getProductos: (params) => api.get('/logistica/productos', { params }),
  createProducto: (data) => api.post('/logistica/productos', data),
  updateStock: (id, data) => api.put(`/logistica/productos/${id}/stock`, data),
  getOrdenes: (params) => api.get('/logistica/ordenes-compra', { params }),
  createOrden: (data) => api.post('/logistica/ordenes-compra', data),
  getDistribuciones: (params) => api.get('/logistica/distribuciones', { params }),
  createDistribucion: (data) => api.post('/logistica/distribuciones', data),
  metrics: () => api.get('/logistica/metrics'),
};

/* ── Administracion ── */
export const adminAPI = {
  getTransacciones: (params) => api.get('/administracion/transacciones', { params }),
  createTransaccion: (data) => api.post('/administracion/transacciones', data),
  getEmpleados: (params) => api.get('/administracion/empleados', { params }),
  createEmpleado: (data) => api.post('/administracion/empleados', data),
  updateEmpleado: (id, data) => api.put(`/administracion/empleados/${id}`, data),
  getTesoreria: () => api.get('/administracion/tesoreria'),
  // Contabilidad
  getPlanCuentas: () => api.get('/administracion/plan-cuentas'),
  createCuentaContable: (data) => api.post('/administracion/plan-cuentas', data),
  getAsientos: (params) => api.get('/administracion/asientos', { params }),
  createAsiento: (data) => api.post('/administracion/asientos', data),
  getAsiento: (id) => api.get(`/administracion/asientos/${id}`),
  // Tesorería
  getCuentasBancarias: () => api.get('/administracion/cuentas-bancarias'),
  createCuentaBancaria: (data) => api.post('/administracion/cuentas-bancarias', data),
  getPagosProgramados: (params) => api.get('/administracion/pagos-programados', { params }),
  createPagoProgramado: (data) => api.post('/administracion/pagos-programados', data),
  completarPago: (id) => api.put(`/administracion/pagos-programados/${id}/completar`),
};

/* ── Tecnologia ── */
export const techAPI = {
  getTickets: (params) => api.get('/tecnologia/tickets', { params }),
  createTicket: (data) => api.post('/tecnologia/tickets', data),
  getTicket: (id) => api.get(`/tecnologia/tickets/${id}`),
  updateTicket: (id, data) => api.put(`/tecnologia/tickets/${id}`, data),
};

/* ── Produccion ── */
export const produccionAPI = {
  getOrdenes: (params) => api.get('/produccion/ordenes', { params }),
  createOrden: (data) => api.post('/produccion/ordenes', data),
  updateEstado: (id, data) => api.put(`/produccion/ordenes/${id}/estado`, data),
  getInspecciones: (params) => api.get('/produccion/inspecciones', { params }),
  createInspeccion: (data) => api.post('/produccion/inspecciones', data),
};

/* ── Usuarios ── */
export const usuariosAPI = {
  getAll: (params) => api.get('/usuarios', { params }),
  create: (data) => api.post('/usuarios', data),
  update: (id, data) => api.put(`/usuarios/${id}`, data),
  updateMe: (data) => api.put('/usuarios/me', data),
  toggle: (id) => api.put(`/usuarios/${id}/toggle`),
};

/* ── Reportes ── */
export const reportesAPI = {
  downloadCSV: (type, params) => api.get(`/reportes/${type}/csv`, {
    params,
    responseType: 'blob',
  }),
};
