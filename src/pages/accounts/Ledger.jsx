import React, { useState } from 'react';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Input from '../../components/common/Input';

const Ledger = () => {
  const [ledger, setLedger] = useState([]);

  const columns = [
    { header: 'Date', accessor: 'date' },
    { header: 'Account', accessor: 'account' },
    { header: 'Description', accessor: 'description' },
    { header: 'Debit', accessor: 'debit' },
    { header: 'Credit', accessor: 'credit' },
    { header: 'Balance', accessor: 'balance' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Ledger</h1>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Input type="date" label="From Date" />
          <Input type="date" label="To Date" />
        </div>
        <Table columns={columns} data={ledger} />
      </Card>
    </div>
  );
};

export default Ledger;
