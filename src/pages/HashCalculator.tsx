import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const HashCalculator = () => {
  const [password, setPassword] = useState('Qwerdsx123!');
  const [hash, setHash] = useState('');

  const calculateHash = async () => {
    try {
      const response = await fetch('https://functions.poehali.dev/c077a61b-25a3-46e9-b0aa-0f7b55512d2e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      setHash(data.hash);
      console.log('Password:', password);
      console.log('Hash:', data.hash);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">Password Hash Calculator</h1>
      <div className="space-y-4 max-w-md">
        <Input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
        />
        <Button onClick={calculateHash}>Calculate Hash</Button>
        {hash && (
          <div className="p-4 bg-gray-100 rounded">
            <p className="text-xs break-all">{hash}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HashCalculator;
