
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"; // Ensure CardFooter is imported
import { Briefcase, Zap, Users, Send, BarChart3, LogIn, Search, DollarSign, WrenchIcon, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  const features = [
    {
      icon: <Zap className="h-8 w-8 text-accent" />,
      title: "AI-Powered Communication",
      description: "Automate client interactions, from lead nurturing to estimate follow-ups, with intelligent AI responses.",
      dataAiHint: "automation communication"
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-accent" />,
      title: "Intelligent Lead Scoring",
      description: "Prioritize your efforts with AI that analyzes and scores leads based on their potential and engagement.",
      dataAiHint: "analytics chart"
    },
    {
      icon: <Users className="h-8 w-8 text-accent" />,
      title: "Role-Based Dashboards",
      description: "Customized views for admins, sales, and technicians, ensuring everyone has the right tools at their fingertips.",
      dataAiHint: "team collaboration"
    },
    {
      icon: <Send className="h-8 w-8 text-accent" />,
      title: "Streamlined Job Dispatch",
      description: "Efficiently assign jobs to technicians and track progress from start to finish with automated notifications.",
      dataAiHint: "logistics planning"
    },
  ];

  const clientTools = [
    {
      icon: <Search className="h-10 w-10 text-primary" />,
      title: "Check Your Estimate",
      description: "View the details and status of your service estimate.",
      href: "/client/find-estimate",
      cta: "Find Estimate",
      dataAiHint: "document search"
    },
    {
      icon: <DollarSign className="h-10 w-10 text-primary" />,
      title: "Pay Your Invoice",
      description: "Securely access and pay your outstanding invoices online.",
      href: "/client/find-invoice",
      cta: "Find Invoice",
      dataAiHint: "payment money"
    },
    {
      icon: <WrenchIcon className="h-10 w-10 text-primary" />,
      title: "Track Your Job Status",
      description: "Get real-time updates on the progress of your scheduled service.",
      href: "/client/track-job",
      cta: "Track Job",
      dataAiHint: "tools construction"
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-secondary/30">
      {/* Header */}
      <header className="container mx-auto py-6 px-4 md:px-6 flex justify-between items-center sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2">
          <Briefcase className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-primary">Luxe Maintainance CRM</span>
        </Link>
        <nav className="space-x-2 sm:space-x-4">
          <Button variant="ghost" asChild>
            <Link href="#client-tools">Client Portal</Link>
          </Button>
          <Button asChild>
            <Link href="/login">
              Company Login <LogIn className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto py-16 px-4 md:px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-6">
              Elevate Your Maintenance Business with <span className="text-primary">Luxe Maintainance CRM</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10">
              Luxe Maintainance CRM is the all-in-one CRM designed for LUXE Maintenance Corporation. Automate workflows, enhance client communication, and drive growth with intelligent tools.
            </p>
            <div className="space-x-4">
              <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
                <Link href="/login">Get Started</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-primary text-primary hover:bg-primary/10 shadow-lg">
                <Link href="#features">Learn More</Link>
              </Button>
            </div>
          </div>
          <div className="mt-16 relative max-w-4xl mx-auto">
            <Image
              src="https://placehold.co/1200x600.png"
              alt="Luxe Maintainance CRM Dashboard Mockup"
              width={1200}
              height={600}
              className="rounded-xl shadow-2xl object-cover"
              data-ai-hint="dashboard interface"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent rounded-xl"></div>
          </div>
        </section>
        
        {/* Client Tools Section */}
        <section id="client-tools" className="py-20 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">Client Self-Service</h2>
              <p className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">
                Quickly access your service information using your reference number.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {clientTools.map((tool) => (
                <Card key={tool.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
                  <CardHeader className="items-center text-center">
                    <div className="p-4 bg-primary/10 rounded-full mb-4 inline-block">
                      {tool.icon}
                    </div>
                    <CardTitle className="text-xl">{tool.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <CardDescription className="text-center min-h-[40px]">{tool.description}</CardDescription>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full bg-primary hover:bg-primary/80 text-primary-foreground">
                      <Link href={tool.href}>
                        {tool.cta} <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">Why Choose Luxe Maintainance CRM?</h2>
              <p className="text-lg text-muted-foreground mt-2">
                Powerful features to streamline your operations and delight your customers.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow duration-300 bg-card">
                  <CardHeader className="items-center">
                    <div className="p-4 bg-accent/10 rounded-full mb-4">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl text-center">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center min-h-[60px]">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Ready to Transform Your Business?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join LUXE Maintenance Corporation in leveraging the power of Luxe Maintainance CRM to achieve new heights of efficiency and customer satisfaction.
            </p>
            <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg">
              <Link href="/login">Access Your Account</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="container mx-auto py-8 px-4 md:px-6 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Luxe Maintainance CRM by LUXE Maintenance Corporation. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

    