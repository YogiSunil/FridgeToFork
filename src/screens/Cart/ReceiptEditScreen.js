import React, { useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  TextInput, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography, shadows } from '../../theme';
import { updateReceipt } from '../../store/slices/cartSlice';

const toPriceString = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
};

export default function ReceiptEditScreen() {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const nav = useNavigation();
  const route = useRoute();
  const receiptId = route?.params?.receiptId;
  const receipts = useSelector((state) => state.cart.receipts);

  const receipt = useMemo(
    () => receipts.find((r) => r.id === receiptId),
    [receipts, receiptId]
  );

  const [items, setItems] = useState(
    Array.isArray(receipt?.items)
      ? receipt.items.map((item) => ({
          name: item?.name || '',
          price: toPriceString(item?.price),
          category: item?.category || 'other',
          isHealthy: Boolean(item?.isHealthy),
        }))
      : []
  );

  const s = styles(colors);

  if (!receipt) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.centerBox}>
          <Text style={s.emptyText}>Receipt not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const setItemField = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { name: '', price: '0.00', category: 'other', isHealthy: false }]);
  };

  const handleSave = () => {
    const cleaned = items
      .map((item) => ({
        ...item,
        name: (item?.name || '').trim(),
        price: item?.price,
      }))
      .filter((item) => item.name.length > 0);

    if (!cleaned.length) {
      Alert.alert('No Items', 'Add at least one valid item before saving.');
      return;
    }

    dispatch(updateReceipt({ id: receipt.id, items: cleaned }));
    nav.goBack();
  };

  return (
    <SafeAreaView style={s.safe}>
      <FlatList
        data={items}
        keyExtractor={(_, index) => `edit-item-${index}`}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.sm }}>
            <Text style={s.title}>Edit Receipt Items</Text>
            <Text style={s.subtitle}>Update item names or prices, then save.</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={s.itemCard}>
            <TextInput
              style={s.nameInput}
              value={item.name}
              onChangeText={(value) => setItemField(index, 'name', value)}
              placeholder="Item name"
              placeholderTextColor={colors.textMuted}
            />
            <View style={s.row}>
              <Text style={s.priceLabel}>$</Text>
              <TextInput
                style={s.priceInput}
                value={item.price}
                keyboardType="decimal-pad"
                onChangeText={(value) => setItemField(index, 'price', value)}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity style={s.removeBtn} onPress={() => removeItem(index)}>
                <Text style={s.removeBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <TouchableOpacity style={s.addBtn} onPress={addItem}>
              <Text style={s.addBtnText}>+ Add Item</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
              <Text style={s.saveBtnText}>💾 Save Receipt</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = (c) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { ...typography.body, color: c.textSecondary },
  title: { ...typography.h3, color: c.text },
  subtitle: { ...typography.bodyS, color: c.textSecondary, marginTop: 4 },
  itemCard: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  nameInput: {
    ...typography.body,
    color: c.text,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    paddingVertical: 4,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  priceLabel: { ...typography.body, color: c.textSecondary },
  priceInput: {
    flex: 1,
    ...typography.body,
    color: c.text,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    paddingVertical: 4,
  },
  removeBtn: {
    backgroundColor: c.error + '20',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  removeBtnText: { ...typography.label, color: c.error },
  addBtn: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  addBtnText: { ...typography.body, color: c.text },
  saveBtn: {
    backgroundColor: c.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.md,
  },
  saveBtnText: { ...typography.h4, color: '#fff' },
});
