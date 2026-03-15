import React, { useState } from 'react';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import { productService } from '../../services/productService';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const AddProduct = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    stock: '',
    description: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await productService.create(formData);
      toast.success('Product added successfully');
      navigate('/products');
    } catch (error) {
      toast.error('Failed to add product');
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Add Product</h1>
      <Card>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Product Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <Select
              label="Category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              options={[]}
              required
            />
            <Input
              label="Price"
              name="price"
              type="number"
              value={formData.price}
              onChange={handleChange}
              required
            />
            <Input
              label="Stock"
              name="stock"
              type="number"
              value={formData.stock}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mt-4 flex space-x-2">
            <Button type="submit">Save Product</Button>
            <Button variant="outline" onClick={() => navigate('/products')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddProduct;
