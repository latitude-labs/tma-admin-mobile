import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Theme } from '@/constants/Theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import kitOrdersService from '@/services/api/kitOrders.service';
import { useAuthStore } from '@/store/authStore';
import { KitCatalogItem, KitItem, KitOrder } from '@/types/kit';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const AnimatedCard = Animated.createAnimatedComponent(Card);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Separate component to avoid hooks in render functions
const CatalogItem: React.FC<{
  item: KitCatalogItem;
  index: number;
  onPress: (item: KitCatalogItem) => void;
  palette: any;
  styles: any;
}> = ({ item, index, onPress, palette, styles }) => {
  const scaleValue = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const handlePress = () => {
    scaleValue.value = withSpring(0.95, { damping: 15, stiffness: 400 }, () => {
      scaleValue.value = withSpring(1, { damping: 10, stiffness: 200 });
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(item);
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'tshirt': return 'shirt-outline';
      case 'trousers': return 'body-outline';
      case 'gloves': return 'hand-left-outline';
      case 'shinpads': return 'shield-outline';
      case 'kitbag': return 'bag-outline';
      default: return 'cube-outline';
    }
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={animatedStyle}
      entering={FadeInUp.delay(index * 100).springify()}
    >
      <Card variant="filled" style={styles.catalogCard}>
        <View style={styles.catalogRow}>
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={styles.catalogImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.catalogImagePlaceholder, { backgroundColor: palette.backgroundSecondary }]}>
              <Ionicons
                name={getIconForType(item.type)}
                size={32}
                color={palette.textTertiary}
              />
            </View>
          )}

          <View style={styles.catalogContent}>
            <Text style={[styles.catalogTitle, { color: palette.text }]}>
              {item.name}
            </Text>
            {item.description ? (
              <Text style={[styles.catalogDescription, { color: palette.textSecondary }]} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            <View style={styles.catalogFooter}>
              <Text style={[styles.catalogPrice, { color: Theme.colors.primary }]}>
                £{item.price.toFixed(2)}
              </Text>
              <Badge variant="default" size="sm">
                {item.sizes.length} sizes
              </Badge>
            </View>
          </View>
        </View>
      </Card>
    </AnimatedPressable>
  );
};

export default function KitOrdersScreen() {
  const router = useRouter();
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<KitOrder[]>([]);
  const [catalog, setCatalog] = useState<KitCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'catalog' | 'orders'>('catalog');
  const [selectedItem, setSelectedItem] = useState<KitCatalogItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);

  // Form state for kit order
  const [studentName, setStudentName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [kitItems, setKitItems] = useState<KitItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Animation values
  const tabIndicatorPosition = useSharedValue(0);
  const cartScale = useSharedValue(1);
  const cartBadgeScale = useSharedValue(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Animate cart badge when items change
    if (kitItems.length > 0) {
      cartBadgeScale.value = withSpring(1, { damping: 10, stiffness: 200 });
    } else {
      cartBadgeScale.value = withSpring(0, { damping: 10, stiffness: 200 });
    }
  }, [kitItems.length]);

  const loadData = async () => {
    try {
      const [ordersResponse, catalogResponse] = await Promise.all([
        kitOrdersService.getKitOrders(),
        kitOrdersService.getKitCatalog(),
      ]);
      setOrders(ordersResponse.data);
      setCatalog(catalogResponse.items);
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Failed to load kit orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const addToCart = (catalogItem: KitCatalogItem, size: string) => {
    const newItem: KitItem = {
      type: catalogItem.type,
      size: size,
    };
    setKitItems([...kitItems, newItem]);

    // Animate cart icon
    cartScale.value = withSpring(1.2, { damping: 5, stiffness: 300 }, () => {
      cartScale.value = withSpring(1, { damping: 10, stiffness: 200 });
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowItemModal(false);
  };

  const removeFromCart = (index: number) => {
    setKitItems(kitItems.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const validateForm = () => {
    if (!studentName.trim()) {
      Alert.alert('Missing Information', 'Please enter the student\'s name');
      return false;
    }
    if (kitItems.length === 0) {
      Alert.alert('No Items Selected', 'Please add at least one kit item to your order');
      return false;
    }
    return true;
  };

  const handleSubmitOrder = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await kitOrdersService.createKitOrder({
        student_name: studentName.trim(),
        contact_email: contactEmail.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
        items: kitItems,
        notes: notes.trim() || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        'Order Placed! 🎉',
        'Your kit order has been successfully submitted.',
        [
          {
            text: 'View Orders',
            onPress: () => {
              setActiveTab('orders');
              setStudentName('');
              setContactEmail('');
              setContactPhone('');
              setNotes('');
              setKitItems([]);
              loadData();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to create kit order:', error);
      Alert.alert('Error', 'Failed to create kit order. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  const switchTab = (tab: 'catalog' | 'orders') => {
    setActiveTab(tab);
    tabIndicatorPosition.value = withSpring(tab === 'catalog' ? 0 : 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const tabIndicatorStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          tabIndicatorPosition.value,
          [0, 1],
          [0, (screenWidth - 32) / 2]
        ),
      },
    ],
  }));

  const cartIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cartScale.value }],
  }));

  const cartBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cartBadgeScale.value }],
    opacity: cartBadgeScale.value,
  }));

  const handleCatalogItemPress = (item: KitCatalogItem) => {
    setSelectedItem(item);
    setShowItemModal(true);
  };

  const [modalSelectedSize, setModalSelectedSize] = useState('');

  const renderItemModal = () => {
    if (!selectedItem) return null;

    return (
      <Modal
        visible={showItemModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowItemModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowItemModal(false)}
        >
          <Animated.View
            style={styles.modalContent}
            entering={FadeInUp.springify()}
          >
            <Pressable>
              <View style={styles.modalHandle} />

              {selectedItem.image_url ? (
                <Image
                  source={{ uri: selectedItem.image_url }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={[styles.modalImagePlaceholder, { backgroundColor: palette.backgroundSecondary }]}>
                  <Ionicons
                    name={getIconForType(selectedItem.type)}
                    size={60}
                    color={palette.textTertiary}
                  />
                </View>
              )}

              <Text style={[styles.modalTitle, { color: palette.text }]}>
                {selectedItem.name}
              </Text>

              {selectedItem.description ? (
                <Text style={[styles.modalDescription, { color: palette.textSecondary }]}>
                  {selectedItem.description}
                </Text>
              ) : null}

              <Text style={[styles.modalPrice, { color: Theme.colors.primary }]}>
                £{selectedItem.price.toFixed(2)}
              </Text>

              <View style={styles.sizeSelector}>
                <Text style={[styles.sizeSelectorTitle, { color: palette.text }]}>
                  Select Size:
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.sizeScrollView}
                >
                  {selectedItem.sizes.map((size) => (
                    <TouchableOpacity
                      key={size}
                      onPress={() => {
                        setModalSelectedSize(size);
                        Haptics.selectionAsync();
                      }}
                      style={[
                        styles.sizeOption,
                        { borderColor: palette.border },
                        modalSelectedSize === size && {
                          backgroundColor: Theme.colors.primary,
                          borderColor: Theme.colors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.sizeOptionText,
                          { color: modalSelectedSize === size ? palette.textInverse : palette.text }
                        ]}
                      >
                        {size}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.modalActions}>
                <Button
                  variant="outline"
                  onPress={() => {
                    setShowItemModal(false);
                    setModalSelectedSize('');
                  }}
                  style={styles.modalButton}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onPress={() => {
                    if (modalSelectedSize) {
                      addToCart(selectedItem, modalSelectedSize);
                      setModalSelectedSize('');
                    }
                  }}
                  disabled={!modalSelectedSize}
                  style={styles.modalButton}
                >
                  Add to Order
                </Button>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    );
  };

  const renderCartView = () => (
    <ScrollView style={styles.cartContainer} showsVerticalScrollIndicator={false}>
      <Card variant="filled" style={styles.formCard}>
        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            Student Information
          </Text>

          <Input
            label="Student Name *"
            value={studentName}
            onChangeText={setStudentName}
            placeholder="Enter student name"
            style={styles.input}
          />

          <Input
            label="Contact Email"
            value={contactEmail}
            onChangeText={setContactEmail}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          <Input
            label="Contact Phone"
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholder="+44 7900 123456"
            keyboardType="phone-pad"
            style={styles.input}
          />
        </View>
      </Card>

      <Card variant="filled" style={styles.formCard}>
        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            Order Items ({kitItems.length})
          </Text>

          {kitItems.length === 0 ? (
            <View style={styles.emptyCart}>
              <Ionicons name="cart-outline" size={48} color={palette.textTertiary} />
              <Text style={[styles.emptyCartText, { color: palette.textSecondary }]}>
                Your order is empty
              </Text>
              <Text style={[styles.emptyCartHint, { color: palette.textTertiary }]}>
                Go to the catalog to add items
              </Text>
            </View>
          ) : (
            <View style={styles.cartItems}>
              {kitItems.map((item, index) => {
                const catalogItem = catalog.find(c => c.type === item.type);
                return (
                  <Animated.View
                    key={index}
                    entering={FadeInDown.delay(index * 50).springify()}
                  >
                    <Card variant="outlined" style={styles.cartItemCard}>
                      <View style={styles.cartItemContent}>
                        <View style={styles.cartItemInfo}>
                          <Text style={[styles.cartItemName, { color: palette.text }]}>
                            {catalogItem?.name || item.type}
                          </Text>
                          <Text style={[styles.cartItemSize, { color: palette.textSecondary }]}>
                            Size: {item.size}
                          </Text>
                          {catalogItem ? (
                            <Text style={[styles.cartItemPrice, { color: Theme.colors.primary }]}>
                              £{catalogItem.price.toFixed(2)}
                            </Text>
                          ) : null}
                        </View>
                        <TouchableOpacity
                          onPress={() => removeFromCart(index)}
                          style={styles.removeButton}
                        >
                          <Ionicons name="trash-outline" size={20} color={palette.statusError} />
                        </TouchableOpacity>
                      </View>
                    </Card>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </View>
      </Card>

      {kitItems.length > 0 ? (
        <Card variant="filled" style={styles.formCard}>
          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              Additional Notes
            </Text>

            <Input
              value={notes}
              onChangeText={setNotes}
              placeholder="Any special requirements or notes..."
              multiline
              numberOfLines={3}
              style={[styles.input, styles.textArea]}
            />
          </View>
        </Card>
      ) : null}

      {kitItems.length > 0 ? (
        <View style={styles.submitContainer}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: palette.textSecondary }]}>
              Total:
            </Text>
            <Text style={[styles.totalAmount, { color: palette.text }]}>
              £{kitItems.reduce((sum, item) => {
                const catalogItem = catalog.find(c => c.type === item.type);
                return sum + (catalogItem?.price || 0);
              }, 0).toFixed(2)}
            </Text>
          </View>

          <Button
            variant="primary"
            onPress={handleSubmitOrder}
            disabled={submitting}
            loading={submitting}
            style={styles.submitButton}
            size="lg"
          >
            {submitting ? 'Placing Order...' : 'Place Order'}
          </Button>
        </View>
      ) : null}
    </ScrollView>
  );

  const renderOrdersTab = () => (
    <ScrollView
      style={styles.ordersContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {orders.length === 0 ? (
        <View style={styles.emptyOrders}>
          <Ionicons name="receipt-outline" size={48} color={palette.textTertiary} />
          <Text style={[styles.emptyOrdersText, { color: palette.textSecondary }]}>
            No orders yet
          </Text>
        </View>
      ) : (
        orders.map((order, index) => (
          <Animated.View
            key={order.id}
            entering={FadeInDown.delay(index * 50).springify()}
          >
            <Card variant="outlined" style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View>
                  <Text style={[styles.orderStudent, { color: palette.text }]}>
                    {order.student_name || ''}
                  </Text>
                  <Text style={[styles.orderDate, { color: palette.textSecondary }]}>
                    {new Date(order.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Badge
                  variant={getStatusVariant(order.status)}
                  size="sm"
                >
                  {order.status || 'pending'}
                </Badge>
              </View>

              <View style={styles.orderItems}>
                {order.items.map((item, itemIndex) => (
                  <Text key={itemIndex} style={[styles.orderItem, { color: palette.textSecondary }]}>
                    • {catalog.find(c => c.type === item.type)?.name || item.type} - {item.size}
                  </Text>
                ))}
              </View>

              {order.notes ? (
                <Text style={[styles.orderNotes, { color: palette.textTertiary }]}>
                  {order.notes}
                </Text>
              ) : null}
            </Card>
          </Animated.View>
        ))
      )}
    </ScrollView>
  );

  const getIconForType = (type: string) => {
    switch (type) {
      case 'tshirt': return 'shirt-outline';
      case 'trousers': return 'body-outline';
      case 'gloves': return 'hand-left-outline';
      case 'shinpads': return 'shield-outline';
      case 'kitbag': return 'bag-outline';
      default: return 'cube-outline';
    }
  };

  const getStatusVariant = (status?: string) => {
    switch (status) {
      case 'distributed': return 'success';
      case 'received': return 'info';
      case 'ordered': return 'warning';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: palette.background }]}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: palette.text }]}>Kit Orders</Text>

        {activeTab === 'catalog' ? (
          <TouchableOpacity onPress={() => switchTab('orders')}>
            <Animated.View style={cartIconStyle}>
              <Ionicons name="cart" size={24} color={palette.text} />
              {kitItems.length > 0 ? (
                <Animated.View style={[styles.cartBadge, cartBadgeStyle]}>
                  <Text style={styles.cartBadgeText}>{kitItems.length}</Text>
                </Animated.View>
              ) : null}
            </Animated.View>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => switchTab('catalog')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'catalog' ? Theme.colors.primary : palette.textSecondary }
            ]}
          >
            Catalog
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => switchTab('orders')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'orders' ? Theme.colors.primary : palette.textSecondary }
            ]}
          >
            Orders
          </Text>
        </TouchableOpacity>

        <Animated.View style={[styles.tabIndicator, tabIndicatorStyle]} />
      </View>

      {activeTab === 'catalog' && kitItems.length > 0 ? (
        renderCartView()
      ) : activeTab === 'catalog' ? (
        <ScrollView
          style={styles.catalogContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <View style={styles.catalogGrid}>
            {catalog.map((item, index) => (
              <CatalogItem
                key={item.id}
                item={item}
                index={index}
                onPress={handleCatalogItemPress}
                palette={palette}
                styles={styles}
              />
            ))}
          </View>
        </ScrollView>
      ) : (
        renderOrdersTab()
      )}

      {renderItemModal()}
      </View>
    </>
  );
}

const createStyles = (palette: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60, // Account for safe area since we removed native header
    paddingBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Theme.colors.status.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: palette.textInverse,
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.bold,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    position: 'relative',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 3,
    backgroundColor: Theme.colors.primary,
    borderRadius: 1.5,
    width: (screenWidth - 64) / 2,
  },
  catalogContainer: {
    flex: 1,
  },
  catalogGrid: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  catalogCard: {
    marginBottom: 12,
    overflow: 'hidden',
    padding: 12,
  },
  catalogRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catalogImage: {
    width: 80,
    height: 80,
    borderRadius: Theme.borderRadius.md,
    marginRight: 12,
  },
  catalogImagePlaceholder: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Theme.borderRadius.md,
    marginRight: 12,
  },
  catalogContent: {
    flex: 1,
  },
  catalogTitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    marginBottom: 4,
  },
  catalogDescription: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    marginBottom: 8,
    lineHeight: 18,
  },
  catalogFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  catalogPrice: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: palette.background,
    borderTopLeftRadius: Theme.borderRadius.xl,
    borderTopRightRadius: Theme.borderRadius.xl,
    padding: 20,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: palette.borderLight,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalImage: {
    width: '100%',
    height: 250,
    borderRadius: Theme.borderRadius.lg,
    marginBottom: 16,
  },
  modalImagePlaceholder: {
    width: '100%',
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Theme.borderRadius.lg,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.semibold,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    marginBottom: 16,
    lineHeight: 22,
  },
  modalPrice: {
    fontSize: Theme.typography.sizes['2xl'],
    fontFamily: Theme.typography.fonts.bold,
    marginBottom: 20,
  },
  sizeSelector: {
    marginBottom: 20,
  },
  sizeSelectorTitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    marginBottom: 12,
  },
  sizeScrollView: {
    maxHeight: 100,
  },
  sizeOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 2,
    borderRadius: Theme.borderRadius.lg,
    marginRight: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  sizeOptionText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
  cartContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  formCard: {
    marginBottom: 16,
  },
  formSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  emptyCart: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCartText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    marginTop: 12,
  },
  emptyCartHint: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    marginTop: 4,
  },
  cartItems: {
    gap: 12,
  },
  cartItemCard: {
    padding: 12,
  },
  cartItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    marginBottom: 4,
  },
  cartItemSize: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
  },
  removeButton: {
    padding: 8,
  },
  submitContainer: {
    paddingVertical: 20,
    paddingBottom: 100,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  totalLabel: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.regular,
  },
  totalAmount: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
  },
  submitButton: {
    marginHorizontal: 16,
  },
  ordersContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyOrders: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyOrdersText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    marginTop: 12,
  },
  orderCard: {
    marginBottom: 12,
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderStudent: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
  },
  orderDate: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    marginTop: 2,
  },
  orderItems: {
    marginBottom: 8,
  },
  orderItem: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    marginBottom: 2,
  },
  orderNotes: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    fontStyle: 'italic',
    marginTop: 8,
  },
});