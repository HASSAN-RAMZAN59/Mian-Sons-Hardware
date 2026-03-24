import React, { useState } from 'react';
import Card from '../../components/common/Card';
import Select from '../../components/common/Select';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const StockTransfer = () => {
  const [formData, setFormData] = useState({
    from: '',
    to: '',
    product: '',
    quantity: ''
  });

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Stock Transfer</h1>

      <Card>
        <form>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="From Branch" name="from" options={[]} />
            <Select label="To Branch" name="to" options={[]} />
            <Select label="Product" name="product" options={[]} />
            <Input label="Quantity" type="number" name="quantity" />
          </div>
          <div className="mt-4">
            <Button type="submit">Transfer Stock</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default StockTransfer;
