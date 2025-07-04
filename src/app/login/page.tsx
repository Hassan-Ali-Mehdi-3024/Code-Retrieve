import { LoginForm } from "@/components/auth/LoginForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase } from "lucide-react"; // Using Briefcase as a placeholder logo icon
import Link from "next/link";
import { siteConfig } from "@/config/site";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex flex-col items-center">
        <Link href="/" className="flex items-center gap-2 mb-2">
          <Briefcase className="h-10 w-10 text-primary" />
          <h1 className="text-3xl font-bold text-primary">{siteConfig.name}</h1>
        </Link>
        <p className="text-muted-foreground">Access your {siteConfig.name} account</p>
      </div>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome Back!</CardTitle>
          <CardDescription>Enter your credentials to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
       <p className="mt-6 text-center text-sm text-muted-foreground">
        This system is for authorized personnel only.
      </p>
    </div>
  );
}
