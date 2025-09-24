import apiClient from './client';
import { KitOrder, KitCatalogItem } from '@/types/kit';

export interface CreateKitOrderDto {
  booking_id?: number;
  student_name?: string;
  contact_email?: string;
  contact_phone?: string;
  items: Array<{
    type: string;
    size: string;
  }>;
  notes?: string;
}

export interface KitOrdersResponse {
  data: KitOrder[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

class KitOrdersService {
  async getKitCatalog(): Promise<{ items: KitCatalogItem[] }> {
    const response = await apiClient.get('/kit-catalog');
    return response.data;
  }

  async getKitOrders(page: number = 1, search?: string): Promise<KitOrdersResponse> {
    const response = await apiClient.get('/kit-orders', {
      params: {
        page,
        per_page: 20,
        search,
      },
    });
    return response.data;
  }

  async getKitOrder(id: number): Promise<KitOrder> {
    const response = await apiClient.get(`/kit-orders/${id}`);
    return response.data;
  }

  async createKitOrder(data: CreateKitOrderDto): Promise<KitOrder> {
    const response = await apiClient.post('/kit-orders', data);
    return response.data;
  }

  async getBookingKitOrders(bookingId: number): Promise<KitOrder[]> {
    const response = await apiClient.get(`/bookings/${bookingId}/kit-orders`);
    return response.data;
  }
}

export default new KitOrdersService();