import React, { useState } from 'react';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import { useNavigate } from 'react-router-dom';

const AddSale = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    customer: '',
    date: '',
    paymentMethod: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Submit logic here
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">New Sale</h1>
      <Card>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select label="Customer" name="customer" options={[]} />
            <Input label="Date" type="date" name="date" />
            <Select label="Payment Method" name="paymentMethod" options={[]} />
          </div>
          <div className="mt-4 flex space-x-2">
            <Button type="submit">Complete Sale</Button>
            <Button variant="outline" onClick={() => navigate('/sales')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddSale;
