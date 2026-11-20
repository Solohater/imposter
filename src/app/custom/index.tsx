import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '@/shared/theme/colors';
import { NeonButton } from '@/shared/components/NeonButton';
import { useCustomContentStore } from '@/core/store/use-custom-content-store';
import { useHaptics } from '@/shared/hooks/useHaptics';
import { CategoryInfo } from '@/core/types/word.types';

export default function CustomContentScreen() {
  const router = useRouter();
  const haptics = useHaptics();

  const {
    customCategories,
    customItems,
    addCategory,
    deleteCategory,
    addItem,
    deleteItem,
  } = useCustomContentStore();

  const [selectedCategory, setSelectedCategory] = useState<CategoryInfo | null>(null);

  // New Category Modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [catNameAmharic, setCatNameAmharic] = useState('');
  const [catIcon, setCatIcon] = useState('star');

  // New Word / Picture Modal
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemWord, setItemWord] = useState('');
  const [itemWordAmharic, setItemWordAmharic] = useState('');
  const [itemHint, setItemHint] = useState('');
  const [itemHintAmharic, setItemHintAmharic] = useState('');
  const [itemImage, setItemImage] = useState<string | null>(null);
  const [itemDecoyImage, setItemDecoyImage] = useState<string | null>(null);

  const ICON_CHOICES = ['star', 'sparkles', 'heart', 'planet', 'camera', 'game-controller', 'skull', 'trophy'];

  const handleCreateCategory = () => {
    if (!catName.trim()) {
      Alert.alert('Required', 'Please enter a category name.');
      return;
    }
    haptics.success();
    const created = addCategory({
      name: catName.trim(),
      nameAmharic: catNameAmharic.trim() || undefined,
      icon: catIcon,
    });
    setCatName('');
    setCatNameAmharic('');
    setShowCatModal(false);
    setSelectedCategory(created);
  };

  const handlePickImage = async (isDecoy: boolean) => {
    haptics.tap();
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (isDecoy) {
          setItemDecoyImage(result.assets[0].uri);
        } else {
          setItemImage(result.assets[0].uri);
        }
      }
    } catch {
      Alert.alert('Image Picker', 'Could not open image library on this device.');
    }
  };

  const handleCreateItem = () => {
    if (!itemWord.trim()) {
      Alert.alert('Required', 'Please enter a secret word or title.');
      return;
    }
    const hintTrimmed = itemHint.trim();
    if (!hintTrimmed) {
      Alert.alert('Hint Required', 'Please enter a 1-3 word misdirection hint for the imposter.');
      return;
    }
    const wordCount = hintTrimmed.split(/\s+/).length;
    if (wordCount > 3) {
      Alert.alert('Hint Too Long', `Extra hints must be strictly 1 to 3 words (currently ${wordCount} words). Use a quick misleading decoy like "House cat" or "Eiffel tower".`);
      return;
    }

    if (!selectedCategory) return;

    haptics.success();
    addItem({
      word: itemWord.trim(),
      wordAmharic: itemWordAmharic.trim() || undefined,
      category: selectedCategory.name,
      categoryAmharic: selectedCategory.nameAmharic,
      extraHint: hintTrimmed,
      extraHintAmharic: itemHintAmharic.trim() || undefined,
      imageUrl: itemImage || undefined,
      decoyImageUrl: itemDecoyImage || undefined,
    });

    setItemWord('');
    setItemWordAmharic('');
    setItemHint('');
    setItemHintAmharic('');
    setItemImage(null);
    setItemDecoyImage(null);
    setShowItemModal(false);
  };

  const currentCategoryItems = selectedCategory
    ? customItems.filter((i) => i.category.toLowerCase() === selectedCategory.name.toLowerCase())
    : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            haptics.tap();
            if (selectedCategory) {
              setSelectedCategory(null);
            } else {
              router.back();
            }
          }}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {selectedCategory ? selectedCategory.name : 'Custom Categories'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {!selectedCategory ? (
          // ================= VIEW 1: CATEGORY LIST =================
          <>
            <View style={styles.bannerCard}>
              <Ionicons name="color-wand-outline" size={28} color="#FF9100" style={{ marginBottom: 6 }} />
              <Text style={styles.bannerTitle}>Custom Game Packs</Text>
              <Text style={styles.bannerSub}>
                Create your own themed categories, add secret words, 1-3 word decoy hints, and pictures!
              </Text>
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>YOUR CATEGORIES ({customCategories.length})</Text>
              <TouchableOpacity
                onPress={() => {
                  haptics.tap();
                  setShowCatModal(true);
                }}
                style={styles.addCategoryBtn}
              >
                <Ionicons name="add" size={18} color="#0A0A0E" />
                <Text style={styles.addCategoryBtnText}>New Category</Text>
              </TouchableOpacity>
            </View>

            {customCategories.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="folder-open-outline" size={44} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No Custom Categories Yet</Text>
                <Text style={styles.emptySub}>
                  {'Tap "+ New Category" to create your first pack (e.g. "Our Friends", "Famous Landmarks", "Office Memes").'}
                </Text>
              </View>
            ) : (
              <View style={styles.catGrid}>
                {customCategories.map((cat) => {
                  const itemCount = customItems.filter(
                    (i) => i.category.toLowerCase() === cat.name.toLowerCase()
                  ).length;

                  return (
                    <TouchableOpacity
                      key={cat.id}
                      activeOpacity={0.8}
                      onPress={() => {
                        haptics.tap();
                        setSelectedCategory(cat);
                      }}
                      style={styles.catCard}
                    >
                      <View style={styles.catCardTop}>
                        <View style={styles.catIconCircle}>
                          <Ionicons name={cat.icon as any} size={22} color="#FF9100" />
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            haptics.warning();
                            Alert.alert(
                              'Delete Category',
                              `Delete "${cat.name}" and all its words?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Delete',
                                  style: 'destructive',
                                  onPress: () => deleteCategory(cat.id),
                                },
                              ]
                            );
                          }}
                          style={styles.deleteIconBtn}
                        >
                          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.catCardTitle} numberOfLines={1}>
                        {cat.name}
                      </Text>
                      {cat.nameAmharic ? (
                        <Text style={styles.catCardAmharic} numberOfLines={1}>
                          {cat.nameAmharic}
                        </Text>
                      ) : null}
                      <Text style={styles.catCardCount}>{itemCount} items</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        ) : (
          // ================= VIEW 2: ITEMS IN CATEGORY =================
          <>
            <View style={styles.categoryInfoCard}>
              <View style={styles.categoryInfoHeader}>
                <View style={styles.catIconCircleLarge}>
                  <Ionicons name={selectedCategory.icon as any} size={28} color="#FF9100" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.catTitleLarge}>{selectedCategory.name}</Text>
                  {selectedCategory.nameAmharic ? (
                    <Text style={styles.catAmharicLarge}>{selectedCategory.nameAmharic}</Text>
                  ) : null}
                  <Text style={styles.catSubLarge}>
                    {currentCategoryItems.length} secret words / pictures
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.addItemBtn}
                activeOpacity={0.8}
                onPress={() => {
                  haptics.tap();
                  setShowItemModal(true);
                }}
              >
                <Ionicons name="add" size={20} color="#0A0A0E" />
                <Text style={styles.addItemBtnText}>Add Word or Picture Card</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>ITEMS IN PACK ({currentCategoryItems.length})</Text>

            {currentCategoryItems.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="cube-outline" size={44} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>This Category is Empty</Text>
                <Text style={styles.emptySub}>
                  Add words, photos, and 1-3 word misdirection hints to play with this pack!
                </Text>
              </View>
            ) : (
              <View style={styles.itemsList}>
                {currentCategoryItems.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    {item.imageUrl ? (
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.itemThumb}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.itemThumbPlaceholder}>
                        <Ionicons name="text-outline" size={20} color={COLORS.primary} />
                      </View>
                    )}

                    <View style={styles.itemInfo}>
                      <Text style={styles.itemWord}>{item.word}</Text>
                      {item.wordAmharic ? (
                        <Text style={styles.itemWordAmharic}>{item.wordAmharic}</Text>
                      ) : null}
                      <View style={styles.hintBadgeRow}>
                        <Text style={styles.hintTag}>DECOY HINT: </Text>
                        <Text style={styles.hintValue}>{item.extraHint}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => {
                        haptics.warning();
                        deleteItem(item.id);
                      }}
                      style={styles.itemDeleteBtn}
                    >
                      <Ionicons name="close-circle-outline" size={22} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* MODAL 1: ADD CATEGORY */}
      <Modal visible={showCatModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Custom Category</Text>
              <TouchableOpacity onPress={() => setShowCatModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Category Name (English)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Ethiopian Landmarks"
              placeholderTextColor={COLORS.textMuted}
              value={catName}
              onChangeText={setCatName}
            />

            <Text style={styles.inputLabel}>Category Name (Amharic - Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. የኢትዮጵያ ታዋቂ ቦታዎች"
              placeholderTextColor={COLORS.textMuted}
              value={catNameAmharic}
              onChangeText={setCatNameAmharic}
            />

            <Text style={styles.inputLabel}>Select Icon</Text>
            <View style={styles.iconChoiceRow}>
              {ICON_CHOICES.map((ic) => (
                <TouchableOpacity
                  key={ic}
                  onPress={() => {
                    haptics.tap();
                    setCatIcon(ic);
                  }}
                  style={[
                    styles.iconChoiceBtn,
                    catIcon === ic && styles.iconChoiceBtnActive,
                  ]}
                >
                  <Ionicons
                    name={ic as any}
                    size={20}
                    color={catIcon === ic ? '#FF9100' : COLORS.textMuted}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ marginTop: 20 }}>
              <NeonButton title="Save Category" icon="checkmark" onPress={handleCreateCategory} />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: ADD ITEM (WORD / PICTURE) */}
      <Modal visible={showItemModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalCardScroll}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Item / Secret Card</Text>
                <TouchableOpacity onPress={() => setShowItemModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Secret Word / Name (for Civilians) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Big Ben"
                placeholderTextColor={COLORS.textMuted}
                value={itemWord}
                onChangeText={setItemWord}
              />

              <Text style={styles.inputLabel}>Amharic Translation (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. ቢግ ቤን"
                placeholderTextColor={COLORS.textMuted}
                value={itemWordAmharic}
                onChangeText={setItemWordAmharic}
              />

              <Text style={styles.inputLabel}>
                Misdirection Decoy Hint (Max 3 Words) *
              </Text>
              <Text style={styles.inputHelper}>
                {'Must lead the imposter to the wrong answer (e.g. for Big Ben, enter "Eiffel tower").'}
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Lattice tower"
                placeholderTextColor={COLORS.textMuted}
                value={itemHint}
                onChangeText={setItemHint}
              />

              <Text style={styles.inputLabel}>Misdirection Hint (Amharic - Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. የአይፈል ግንብ"
                placeholderTextColor={COLORS.textMuted}
                value={itemHintAmharic}
                onChangeText={setItemHintAmharic}
              />

              {/* Photo Clue (Civilian) */}
              <Text style={styles.inputLabel}>Civilian Photo Card (Optional for Picture Mode)</Text>
              <View style={styles.photoPickerRow}>
                {itemImage ? (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: itemImage }} style={styles.previewImg} contentFit="cover" />
                    <TouchableOpacity
                      onPress={() => setItemImage(null)}
                      style={styles.removePreviewBtn}
                    >
                      <Ionicons name="close" size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => handlePickImage(false)}
                    style={styles.pickPhotoBtn}
                  >
                    <Ionicons name="image-outline" size={22} color="#00E5FF" />
                    <Text style={styles.pickPhotoText}>Choose Photo from Device</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Decoy Photo (Imposter) */}
              <Text style={styles.inputLabel}>Imposter Decoy Photo (Optional Misdirection)</Text>
              <View style={styles.photoPickerRow}>
                {itemDecoyImage ? (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: itemDecoyImage }} style={styles.previewImg} contentFit="cover" />
                    <TouchableOpacity
                      onPress={() => setItemDecoyImage(null)}
                      style={styles.removePreviewBtn}
                    >
                      <Ionicons name="close" size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => handlePickImage(true)}
                    style={[styles.pickPhotoBtn, { borderColor: 'rgba(255, 145, 0, 0.4)' }]}
                  >
                    <Ionicons name="warning-outline" size={22} color="#FF9100" />
                    <Text style={[styles.pickPhotoText, { color: '#FF9100' }]}>
                      Choose Decoy Photo (Misleads Imposter)
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ marginTop: 24 }}>
                <NeonButton title="Add to Category" icon="checkmark" onPress={handleCreateItem} />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  container: {
    padding: 20,
    paddingBottom: 60,
  },
  bannerCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 145, 0, 0.3)',
    marginBottom: 20,
  },
  bannerTitle: {
    color: '#FF9100',
    fontSize: 18,
    fontWeight: '800',
  },
  bannerSub: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  addCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9100',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addCategoryBtnText: {
    color: '#0A0A0E',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 4,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 10,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },
  emptySub: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  catCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  catIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 145, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIconBtn: {
    padding: 4,
  },
  catCardTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  catCardAmharic: {
    color: '#FF9100',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  catCardCount: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  categoryInfoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  categoryInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catIconCircleLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 145, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catTitleLarge: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  catAmharicLarge: {
    color: '#FF9100',
    fontSize: 13,
    fontWeight: '700',
  },
  catSubLarge: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E5FF',
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 16,
  },
  addItemBtnText: {
    color: '#0A0A0E',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 6,
  },
  itemsList: {
    gap: 10,
    marginTop: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  itemThumbPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: COLORS.cardSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemWord: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  itemWordAmharic: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  hintBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  hintTag: {
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: '900',
  },
  hintValue: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  itemDeleteBtn: {
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCardScroll: {
    paddingVertical: 40,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  inputLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  inputHelper: {
    color: COLORS.warning,
    fontSize: 11,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: COLORS.cardSecondary,
    borderRadius: 12,
    padding: 12,
    color: COLORS.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconChoiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  iconChoiceBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.cardSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconChoiceBtnActive: {
    borderColor: '#FF9100',
    backgroundColor: 'rgba(255, 145, 0, 0.15)',
  },
  photoPickerRow: {
    marginTop: 4,
  },
  pickPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.4)',
    borderStyle: 'dashed',
    backgroundColor: COLORS.cardSecondary,
  },
  pickPhotoText: {
    color: '#00E5FF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  previewContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImg: {
    width: '100%',
    height: '100%',
  },
  removePreviewBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    padding: 2,
  },
});
