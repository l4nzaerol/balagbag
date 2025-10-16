# JavaScript Hoisting Error Fix

## Problem
The InventoryPage component was throwing a runtime error:
```
Cannot access 'fetchInventory' before initialization
ReferenceError: Cannot access 'fetchInventory' before initialization
```

## Root Cause
The issue was caused by JavaScript hoisting problems where:
1. `useEffect` hooks were trying to use `fetchInventory` and `fetchAlkansyaStats` in their dependency arrays
2. These functions were defined after the `useEffect` hooks that referenced them
3. This created a temporal dead zone where the functions were referenced before being initialized

## Solution Implemented

### 1. **Used `useCallback` for Function Definitions**
- Converted `fetchInventory` to `useCallback` to ensure proper dependency management
- Converted `fetchAlkansyaStats` to `useCallback` for consistency
- Converted `apiCall` to `useCallback` to prevent unnecessary re-renders

### 2. **Reordered Code Structure**
- Moved function definitions before the `useEffect` hooks that use them
- Ensured proper dependency arrays in all `useEffect` hooks
- Fixed the temporal dead zone issue

### 3. **Proper Dependency Management**
```javascript
// Before (causing hoisting error)
useEffect(() => {
  fetchInventory();
  fetchAlkansyaStats();
}, [fetchInventory, fetchAlkansyaStats]); // Functions not yet defined

const fetchInventory = async () => { ... };

// After (fixed)
const fetchInventory = useCallback(async () => {
  // function body
}, [apiCall]);

const fetchAlkansyaStats = useCallback(async () => {
  // function body  
}, [apiCall]);

useEffect(() => {
  fetchInventory();
  fetchAlkansyaStats();
}, [fetchInventory, fetchAlkansyaStats]); // Functions now properly defined
```

## Files Modified
- **`casptone-front/src/components/Admin/InventoryPage.jsx`**
  - Added `useCallback` import
  - Converted functions to `useCallback`
  - Reordered function definitions
  - Fixed dependency arrays

## Result
✅ **Runtime Error Resolved**: The "Cannot access before initialization" error is now fixed
✅ **Proper Dependencies**: All `useEffect` hooks have correct dependency arrays
✅ **Performance Optimized**: Functions are properly memoized with `useCallback`
✅ **Code Structure**: Functions are defined before they are used

The production status auto-update functionality now works without JavaScript hoisting errors!
