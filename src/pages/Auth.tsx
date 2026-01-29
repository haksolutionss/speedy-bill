import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { Phone, Lock, User, Loader2 } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const { login, signup } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  // Login form
  const [loginMobile, setLoginMobile] = useState('');
  const [loginPin, setLoginPin] = useState('');

  // Signup form
  const [signupMobile, setSignupMobile] = useState('');
  const [signupPin, setSignupPin] = useState('');
  const [signupConfirmPin, setSignupConfirmPin] = useState('');
  const [signupName, setSignupName] = useState('');

  const validateMobile = (mobile: string): boolean => {
    return /^\d{10}$/.test(mobile);
  };

  const validatePin = (pin: string): boolean => {
    return /^\d{4}$/.test(pin);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateMobile(loginMobile)) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    if (!validatePin(loginPin)) {
      toast.error('Please enter a 4-digit PIN');
      return;
    }

    setIsLoading(true);
    const result = await login(loginMobile, loginPin);
    setIsLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      toast.error(result.error || 'Login failed');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateMobile(signupMobile)) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    if (!validatePin(signupPin)) {
      toast.error('Please enter a 4-digit PIN');
      return;
    }

    if (signupPin !== signupConfirmPin) {
      toast.error('PINs do not match');
      return;
    }

    setIsLoading(true);
    const result = await signup(signupMobile, signupPin, signupName || undefined);
    setIsLoading(false);

    if (result.success) {
      navigate('/onboarding');
    } else {
      toast.error(result.error || 'Signup failed');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">HotelAqsa POS</CardTitle>
          <CardDescription>Sign in to manage your restaurant</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-mobile">Mobile Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-mobile"
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={loginMobile}
                      onChange={(e) => setLoginMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="pl-10"
                      maxLength={10}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-pin">4-Digit PIN</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-pin"
                      type="password"
                      placeholder="••••"
                      value={loginPin}
                      onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="pl-10 text-center tracking-[0.5em]"
                      maxLength={4}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Name (Optional)</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Your name"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-mobile">Mobile Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-mobile"
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={signupMobile}
                      onChange={(e) => setSignupMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="pl-10"
                      maxLength={10}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-pin">Create 4-Digit PIN</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-pin"
                      type="password"
                      placeholder="••••"
                      value={signupPin}
                      onChange={(e) => setSignupPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="pl-10 text-center tracking-[0.5em]"
                      maxLength={4}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-pin">Confirm PIN</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-confirm-pin"
                      type="password"
                      placeholder="••••"
                      value={signupConfirmPin}
                      onChange={(e) => setSignupConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="pl-10 text-center tracking-[0.5em]"
                      maxLength={4}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
