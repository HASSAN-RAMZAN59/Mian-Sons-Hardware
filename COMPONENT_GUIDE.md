# Mian & Sons Hardware Store - Component Usage Guide

## 🎨 Common Components

### 1. EmptyState Component
Display when tables or lists have no data.

```jsx
import EmptyState from '../../components/common/EmptyState';
import { FaBox, FaUsers } from 'react-icons/fa';

// Simple usage with emoji
<EmptyState 
  emoji="📦"
  title="No Products Found"
  message="Start by adding your first product to the inventory."
  actionLabel="Add Product"
  onAction={() => setShowAddModal(true)}
/>

// With custom icon
<EmptyState 
  icon={FaUsers}
  title="No Customers Yet"
  message="Your customer list is empty. Add customers to get started."
  actionLabel="Add Customer"
  onAction={handleAddCustomer}
/>

// Without action button
<EmptyState 
  emoji="🔍"
  title="No Results Found"
  message="Try adjusting your search criteria."
/>
```

### 2. TableSkeleton Component
Show loading skeleton while data is being fetched.

```jsx
import TableSkeleton from '../../components/common/TableSkeleton';
import EmptyState from '../../components/common/EmptyState';

const ProductsTable = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);

  return (
    <div>
      {loading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : products.length === 0 ? (
        <EmptyState 
          emoji="📦"
          title="No Products"
          message="Add products to your inventory."
        />
      ) : (
        <table>
          {/* Your table content */}
        </table>
      )}
    </div>
  );
};
```

### 3. ScrollToTop Component
Already added to MainLayout - appears automatically when scrolling.

---

## 🛠️ Utility Functions (helpers.js)

### formatCurrency(amount)
```javascript
import { formatCurrency } from '../utils/helpers';

formatCurrency(1250);        // "Rs. 1,250.00"
formatCurrency(50000);       // "Rs. 50,000.00"
```

### formatDate(date)
```javascript
import { formatDate } from '../utils/helpers';

formatDate(new Date());                    // "11 Mar 2026"
formatDate('2026-03-11');                  // "11 Mar 2026"
```

### formatDateTime(date)
```javascript
import { formatDateTime } from '../utils/helpers';

formatDateTime(new Date());                // "11 Mar 2026, 3:45 PM"
```

### generateInvoiceNumber(lastNumber)
```javascript
import { generateInvoiceNumber } from '../utils/helpers';

generateInvoiceNumber(0);    // "INV-2026-001"
generateInvoiceNumber(45);   // "INV-2026-046"
```

### getStatusColor(status)
```javascript
import { getStatusColor } from '../utils/helpers';

<span className={`px-2 py-1 rounded ${getStatusColor('paid')}`}>
  Paid
</span>

// Returns appropriate Tailwind classes for:
// active, inactive, pending, approved, paid, unpaid, partial
// in-stock, low-stock, out-of-stock, completed, cancelled
// present, absent, late
```

### truncateText(text, length)
```javascript
import { truncateText } from '../utils/helpers';

truncateText("Very long product description...", 30);
// "Very long product descript..."
```

### calculateAge(dateOfBirth)
```javascript
import { calculateAge } from '../utils/helpers';

calculateAge('1990-01-15');  // 36 (years)
```

### getInitials(name)
```javascript
import { getInitials } from '../utils/helpers';

getInitials("Muhammad Ali");     // "MA"
getInitials("Sarah");            // "S"
```

### downloadCSV(data, filename)
```javascript
import { downloadCSV } from '../utils/helpers';

const exportData = [
  { name: 'Product 1', price: 100, stock: 50 },
  { name: 'Product 2', price: 200, stock: 30 }
];

downloadCSV(exportData, 'products-export');
// Downloads "products-export.csv"
```

---

## 📊 Constants (constants.js)

### ROLES
```javascript
import { ROLES } from '../utils/constants';

if (user.role === ROLES.SUPERADMIN) {
  // superadmin logic
}
```

### PAYMENT_METHODS
```javascript
import { PAYMENT_METHODS } from '../utils/constants';

<Select>
  {PAYMENT_METHODS.map(method => (
    <option key={method.value} value={method.value}>
      {method.label}
    </option>
  ))}
</Select>
```

### PRODUCT_UNITS
```javascript
import { PRODUCT_UNITS } from '../utils/constants';

// Same pattern as PAYMENT_METHODS
```

### EXPENSE_CATEGORIES
```javascript
import { EXPENSE_CATEGORIES } from '../utils/constants';

// Array of { value, label } objects
```

### LEAVE_TYPES
```javascript
import { LEAVE_TYPES } from '../utils/constants';

// Array of { value, label } objects
```

### DESIGNATION_OPTIONS
```javascript
import { DESIGNATION_OPTIONS } from '../utils/constants';

// Array of { value, label } objects
```

---

## ⌨️ Keyboard Shortcuts (POS Page)

Already implemented in POS:
- **F9**: Complete Sale
- **ESC**: Clear Cart

To add more shortcuts:
```javascript
useEffect(() => {
  const handleKeyPress = (e) => {
    if (e.key === 'F2') {
      e.preventDefault();
      // Focus search input
    }
  };
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [dependencies]);
```

---

## 🎭 Page Transitions

Already added via CSS! All pages have smooth fade-in animation.

The `page-transition` class is automatically applied in MainLayout.

---

## 🔄 Form Reset Pattern

Always reset forms after successful submission:

```javascript
const handleSubmit = (e) => {
  e.preventDefault();
  
  // Submit logic
  toast.success('Saved successfully!');
  
  // Reset form
  setFormData({
    name: '',
    email: '',
    phone: '',
    // ... reset all fields
  });
  
  // If using ref
  formRef.current?.reset();
  
  // Close modal if applicable
  setShowModal(false);
};
```

---

## 📱 Current Page Name in Navbar

Already implemented! The Navbar automatically shows:
- Page title (e.g., "Products", "Dashboard")
- Breadcrumbs navigation

No additional code needed.

---

## 🎨 Loading & Empty States Pattern

```javascript
const MyComponent = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await api.getData();
      setData(result);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      {loading ? (
        <TableSkeleton rows={5} columns={4} />
      ) : data.length === 0 ? (
        <EmptyState 
          emoji="📭"
          title="No Data"
          message="There are no items to display."
          actionLabel="Add New"
          onAction={handleAdd}
        />
      ) : (
        <table>
          {/* Table content */}
        </table>
      )}
    </Card>
  );
};
```

---

## ✅ Complete Checklist

- ✅ formatCurrency() helper
- ✅ formatDate() helper  
- ✅ formatDateTime() helper
- ✅ generateInvoiceNumber() helper
- ✅ getStatusColor() helper
- ✅ truncateText() helper
- ✅ calculateAge() helper
- ✅ ROLES constant
- ✅ STATUS constant
- ✅ PAYMENT_METHODS array
- ✅ PRODUCT_UNITS array
- ✅ EXPENSE_CATEGORIES array
- ✅ LEAVE_TYPES array
- ✅ DESIGNATION_OPTIONS array
- ✅ ToastContainer in App.js (already present)
- ✅ Smooth page transitions (CSS animations)
- ✅ Navbar shows current page name dynamically
- ✅ Scroll to top button (appears on scroll)
- ✅ Keyboard shortcuts in POS (F9, ESC)
- ✅ Form reset pattern documented
- ✅ TableSkeleton component for loading states
- ✅ EmptyState component for no data
