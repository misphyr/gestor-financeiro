// Ícones disponíveis para categorias
import {
  ShoppingCart, Car, Heart, Gamepad2, BookOpen, MoreHorizontal,
  Home, Utensils, Zap, Music, Smartphone, Briefcase, Pill,
  Plane, Coffee, Gift, Dumbbell, Monitor, Wifi, Droplet,
  Wind, Trash2, MapPin
} from 'lucide-react';

export const AVAILABLE_ICONS = [
  { name: 'ShoppingCart', label: 'Compras', icon: ShoppingCart },
  { name: 'Car', label: 'Transporte', icon: Car },
  { name: 'Heart', label: 'Saúde', icon: Heart },
  { name: 'Gamepad2', label: 'Lazer', icon: Gamepad2 },
  { name: 'BookOpen', label: 'Educação', icon: BookOpen },
  { name: 'Home', label: 'Casa', icon: Home },
  { name: 'Utensils', label: 'Alimentação', icon: Utensils },
  { name: 'Zap', label: 'Energia', icon: Zap },
  { name: 'Music', label: 'Música', icon: Music },
  { name: 'Smartphone', label: 'Telefone', icon: Smartphone },
  { name: 'Briefcase', label: 'Trabalho', icon: Briefcase },
  { name: 'Pill', label: 'Medicamentos', icon: Pill },
  { name: 'Plane', label: 'Viagem', icon: Plane },
  { name: 'Coffee', label: 'Bebidas', icon: Coffee },
  { name: 'Gift', label: 'Presentes', icon: Gift },
  { name: 'Dumbbell', label: 'Academia', icon: Dumbbell },
  { name: 'Monitor', label: 'Eletrônicos', icon: Monitor },
  { name: 'Wifi', label: 'Internet', icon: Wifi },
  { name: 'Droplet', label: 'Água', icon: Droplet },
  { name: 'Wind', label: 'Gás', icon: Wind },
  { name: 'Trash2', label: 'Limpeza', icon: Trash2 },
  { name: 'MapPin', label: 'Localização', icon: MapPin },
  { name: 'MoreHorizontal', label: 'Outros', icon: MoreHorizontal },
];

export const AVAILABLE_COLORS = [
  { name: '#EC4899', label: 'Rosa' },
  { name: '#06B6D4', label: 'Ciano' },
  { name: '#10B981', label: 'Verde' },
  { name: '#F59E0B', label: 'Âmbar' },
  { name: '#8B5CF6', label: 'Roxo' },
  { name: '#6B7280', label: 'Cinza' },
  { name: '#EF4444', label: 'Vermelho' },
  { name: '#3B82F6', label: 'Azul' },
  { name: '#14B8A6', label: 'Turquesa' },
  { name: '#F97316', label: 'Laranja' },
];

export const getIconComponent = (iconName) => {
  const found = AVAILABLE_ICONS.find(i => i.name === iconName);
  return found ? found.icon : MoreHorizontal;
};
